package databaseConnection

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/url"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/agent"
)

const sshDialTimeout = 15 * time.Second

// sshTunnel forwards a loopback listener to remoteAddr through an SSH server
// (optionally reached via a bastion jump host).
type sshTunnel struct {
	listener net.Listener
	clients  []*ssh.Client
	wg       sync.WaitGroup
	once     sync.Once
}

// SSHOptions returns the enabled SSH config of the connection, or nil.
func SSHOptions(connection *model.Connection) *dto.ConnectionSSHParams {
	raw := gjson.Get(connection.Options, "ssh")
	if !raw.Exists() {
		return nil
	}

	cfg, err := helper.RawJSONToStruct[dto.ConnectionSSHParams](json.RawMessage(raw.Raw))
	if err != nil || !cfg.Enabled {
		return nil
	}

	dto.NormalizeSSH(&cfg)

	return &cfg
}

// openSSHTunnel starts a tunnel for connection and returns a copy of it whose
// host/port point at the local listener. The original is left untouched.
func openSSHTunnel(ctx context.Context, connection *model.Connection, cfg *dto.ConnectionSSHParams) (*sshTunnel, *model.Connection, error) {
	remoteHost, remotePort, err := sshRemoteTarget(connection)
	if err != nil {
		return nil, nil, err
	}

	tunnel, err := newSSHTunnel(ctx, cfg, net.JoinHostPort(remoteHost, remotePort))
	if err != nil {
		return nil, nil, err
	}

	local := tunnel.listener.Addr().(*net.TCPAddr)
	localPort := strconv.Itoa(local.Port)

	options, err := rewriteOptionsTarget(connection.Options, local.IP.String(), localPort)
	if err != nil {
		_ = tunnel.Close()

		return nil, nil, err
	}

	// TLS certificates are issued for the real DB host, not the loopback.
	options, _ = sjson.Set(options, tlsServerNameKey, remoteHost)

	dialConn := *connection
	dialConn.Options = options

	return tunnel, &dialConn, nil
}

func newSSHTunnel(ctx context.Context, cfg *dto.ConnectionSSHParams, remoteAddr string) (*sshTunnel, error) {
	t := &sshTunnel{}

	// Hop order: outermost jump first, final SSH server last.
	hops := []*dto.ConnectionSSHParams{}
	for hop := cfg; hop != nil; hop = hop.Jump {
		hops = append([]*dto.ConnectionSSHParams{hop}, hops...)
	}

	var prev *ssh.Client

	for _, hop := range hops {
		client, err := dialSSHHop(ctx, prev, hop)
		if err != nil {
			t.closeClients()

			return nil, err
		}

		t.clients = append(t.clients, client)
		prev = client
	}

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.closeClients()

		return nil, fmt.Errorf("ssh tunnel: listen: %w", err)
	}

	t.listener = listener

	t.wg.Add(1)

	go t.serve(prev, remoteAddr)

	return t, nil
}

func dialSSHHop(ctx context.Context, via *ssh.Client, hop *dto.ConnectionSSHParams) (*ssh.Client, error) {
	auth, err := sshAuthMethods(hop)
	if err != nil {
		return nil, err
	}

	clientCfg := &ssh.ClientConfig{
		User:            hop.Username,
		Auth:            auth,
		HostKeyCallback: sshHostKeyCallback(),
		Timeout:         sshDialTimeout,
	}

	addr := net.JoinHostPort(hop.Host, strconv.Itoa(int(hop.Port)))

	dialCtx, cancel := context.WithTimeout(ctx, sshDialTimeout)
	defer cancel()

	var rawConn net.Conn

	if via == nil {
		rawConn, err = (&net.Dialer{}).DialContext(dialCtx, "tcp", addr)
	} else {
		rawConn, err = via.Dial("tcp", addr)
	}

	if err != nil {
		return nil, fmt.Errorf("ssh tunnel: connect to %s: %w", addr, err)
	}

	sshConn, chans, reqs, err := ssh.NewClientConn(rawConn, addr, clientCfg)
	if err != nil {
		_ = rawConn.Close()

		return nil, fmt.Errorf("ssh tunnel: authentication failed for %s@%s: %w", hop.Username, addr, err)
	}

	return ssh.NewClient(sshConn, chans, reqs), nil
}

func sshAuthMethods(hop *dto.ConnectionSSHParams) ([]ssh.AuthMethod, error) {
	switch hop.AuthMethod {
	case dto.SSHAuthKey:
		var (
			signer ssh.Signer
			err    error
		)

		key := []byte(lo.FromPtr(hop.PrivateKey))
		if passphrase := lo.FromPtr(hop.Passphrase); passphrase != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase(key, []byte(passphrase))
		} else {
			signer, err = ssh.ParsePrivateKey(key)
		}

		if err != nil {
			return nil, fmt.Errorf("ssh tunnel: invalid private key: %w", err)
		}

		return []ssh.AuthMethod{ssh.PublicKeys(signer)}, nil
	case dto.SSHAuthAgent:
		sock := os.Getenv("SSH_AUTH_SOCK")
		if sock == "" {
			return nil, errors.New("ssh tunnel: SSH_AUTH_SOCK is not set, no ssh-agent available")
		}

		agentConn, err := net.Dial("unix", sock)
		if err != nil {
			return nil, fmt.Errorf("ssh tunnel: ssh-agent: %w", err)
		}

		return []ssh.AuthMethod{ssh.PublicKeysCallback(agent.NewClient(agentConn).Signers)}, nil
	default:
		return []ssh.AuthMethod{ssh.Password(lo.FromPtr(hop.Password))}, nil
	}
}

func (t *sshTunnel) serve(client *ssh.Client, remoteAddr string) {
	defer t.wg.Done()

	for {
		local, err := t.listener.Accept()
		if err != nil {
			return
		}

		t.wg.Add(1)

		go func() {
			defer t.wg.Done()
			defer local.Close()

			remote, err := client.Dial("tcp", remoteAddr)
			if err != nil {
				return
			}
			defer remote.Close()

			done := make(chan struct{}, 2)

			go func() { _, _ = io.Copy(remote, local); done <- struct{}{} }()

			go func() { _, _ = io.Copy(local, remote); done <- struct{}{} }()

			<-done
		}()
	}
}

func (t *sshTunnel) closeClients() {
	for i := len(t.clients) - 1; i >= 0; i-- {
		_ = t.clients[i].Close()
	}
}

// Close stops the listener and the SSH sessions, releasing the local port.
func (t *sshTunnel) Close() error {
	if t == nil {
		return nil
	}

	t.once.Do(func() {
		if t.listener != nil {
			_ = t.listener.Close()
		}

		t.closeClients()
		t.wg.Wait()
	})

	return nil
}

func mergeSSHParams(newSSH, oldSSH *dto.ConnectionSSHParams) *dto.ConnectionSSHParams {
	if newSSH == nil {
		return oldSSH
	}

	merged := *newSSH
	if oldSSH != nil {
		merged.Password = helperOptionalNonEmpty(newSSH.Password, oldSSH.Password)
		merged.PrivateKey = helperOptionalNonEmpty(newSSH.PrivateKey, oldSSH.PrivateKey)
		merged.Passphrase = helperOptionalNonEmpty(newSSH.Passphrase, oldSSH.Passphrase)
		merged.Jump = mergeSSHParams(newSSH.Jump, oldSSH.Jump)
	}

	return &merged
}

func helperOptionalNonEmpty(value, fallback *string) *string {
	if value != nil && *value != "" {
		return value
	}

	return fallback
}

// RedactSSHSecrets blanks SSH credentials in a serialized options JSON so they
// are never returned to clients.
func RedactSSHSecrets(options string) string {
	if !gjson.Get(options, "ssh").Exists() {
		return options
	}

	for prefix := "ssh"; gjson.Get(options, prefix).Exists(); prefix += ".jump" {
		for _, field := range []string{"password", "privateKey", "passphrase"} {
			if gjson.Get(options, prefix+"."+field).String() != "" {
				options, _ = sjson.Set(options, prefix+"."+field, "")
			}
		}
	}

	return options
}

// tlsServerNameKey is set only on the in-memory options of a tunneled
// connection; it is never persisted.
const tlsServerNameKey = "tlsServerName"

func defaultDBPort(connectionType string) string {
	if databaseContract.IsPostgresFamily(connectionType) {
		return "5432"
	}

	return "3306"
}

// sshRemoteTarget returns the database host and port the SSH server must reach.
func sshRemoteTarget(connection *model.Connection) (string, string, error) {
	if uri := gjson.Get(connection.Options, "uri").String(); uri != "" {
		parsed, err := url.Parse(uri)
		if err != nil || parsed.Hostname() == "" {
			return "", "", errors.New("ssh tunnel: cannot read host from connection URI")
		}

		port := parsed.Port()
		if port == "" {
			port = defaultDBPort(connection.ConnectionType)
		}

		return parsed.Hostname(), port, nil
	}

	port := gjson.Get(connection.Options, "port").String()
	if port == "" || port == "0" {
		port = defaultDBPort(connection.ConnectionType)
	}

	return gjson.Get(connection.Options, "host").String(), port, nil
}

// rewriteOptionsTarget points host/port (and the URI host, when set) at the
// local tunnel listener.
func rewriteOptionsTarget(options, host, port string) (string, error) {
	var err error

	if uri := gjson.Get(options, "uri").String(); uri != "" {
		parsed, parseErr := url.Parse(uri)
		if parseErr != nil {
			return options, parseErr
		}

		parsed.Host = net.JoinHostPort(host, port)

		return sjson.Set(options, "uri", parsed.String())
	}

	if options, err = sjson.Set(options, "host", host); err != nil {
		return options, err
	}

	portNum, _ := strconv.Atoi(port)

	return sjson.Set(options, "port", portNum)
}

// FillSSHSecrets copies stored SSH secrets into newOptions wherever the client
// left them blank (secrets are never sent back to clients).
func FillSSHSecrets(newOptions json.RawMessage, storedOptions string) json.RawMessage {
	out := string(newOptions)

	for prefix := "ssh"; gjson.Get(out, prefix).Exists() && gjson.Get(storedOptions, prefix).Exists(); prefix += ".jump" {
		for _, field := range []string{"password", "privateKey", "passphrase"} {
			path := prefix + "." + field
			if gjson.Get(out, path).String() != "" {
				continue
			}

			if stored := gjson.Get(storedOptions, path).String(); stored != "" {
				out, _ = sjson.Set(out, path, stored)
			}
		}
	}

	return json.RawMessage(out)
}
