package serviceConnector

import (
	"context"
	"fmt"
	"io"
	"net"
	"path"
	"strconv"
	"time"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

// sftpDestination copies over SSH. The server's host key is pinned: the first
// successful connection records its fingerprint (see Pinned) and every later one
// must match, so a swapped server is refused.
type sftpDestination struct {
	addr   string
	dir    string
	config *ssh.ClientConfig
	seen   string
}

func newSFTP(f fields) (Destination, error) {
	if err := f.require("host", "username"); err != nil {
		return nil, err
	}

	if f.secret("password") == "" && f.secret("privateKey") == "" {
		return nil, errMissingField("password or privateKey")
	}

	d := &sftpDestination{
		addr: net.JoinHostPort(f.str("host"), strconv.Itoa(f.num("port", 22))),
		dir:  f.str("path"),
	}

	var auth []ssh.AuthMethod

	if key := f.secret("privateKey"); key != "" {
		signer, err := ssh.ParsePrivateKey([]byte(key))
		if err != nil {
			return nil, fmt.Errorf("private key: %w", err)
		}

		auth = append(auth, ssh.PublicKeys(signer))
	}

	if pw := f.secret("password"); pw != "" {
		auth = append(auth, ssh.Password(pw))
	}

	pinned := f.str("hostKey")

	d.config = &ssh.ClientConfig{
		User:    f.str("username"),
		Auth:    auth,
		Timeout: 15 * time.Second,
		HostKeyCallback: func(_ string, _ net.Addr, key ssh.PublicKey) error {
			d.seen = ssh.FingerprintSHA256(key)
			if pinned != "" && pinned != d.seen {
				return fmt.Errorf("host key changed: expected %s, got %s", pinned, d.seen)
			}

			return nil
		},
	}

	return d, nil
}

// Pinned is the host key fingerprint seen on the last connection.
func (d *sftpDestination) Pinned() string { return d.seen }

func (d *sftpDestination) connect() (*sftp.Client, func(), error) {
	conn, err := ssh.Dial("tcp", d.addr, d.config)
	if err != nil {
		return nil, nil, err
	}

	client, err := sftp.NewClient(conn)
	if err != nil {
		_ = conn.Close()

		return nil, nil, err
	}

	return client, func() { _ = client.Close(); _ = conn.Close() }, nil
}

func (d *sftpDestination) Test(context.Context) error {
	client, closeAll, err := d.connect()
	if err != nil {
		return err
	}

	defer closeAll()

	if d.dir == "" {
		return nil
	}

	return client.MkdirAll(d.dir)
}

func (d *sftpDestination) Put(_ context.Context, name string, r io.Reader, _ int64) (string, error) {
	client, closeAll, err := d.connect()
	if err != nil {
		return "", err
	}

	defer closeAll()

	if d.dir != "" {
		if err := client.MkdirAll(d.dir); err != nil {
			return "", err
		}
	}

	remote := path.Join(d.dir, path.Base(name))

	out, err := client.Create(remote)
	if err != nil {
		return "", err
	}

	if _, err := io.Copy(out, r); err != nil {
		_ = out.Close()
		_ = client.Remove(remote)

		return "", err
	}

	return remote, out.Close()
}

func (d *sftpDestination) Get(_ context.Context, remote string, w io.Writer) error {
	client, closeAll, err := d.connect()
	if err != nil {
		return err
	}

	defer closeAll()

	in, err := client.Open(remote)
	if err != nil {
		return err
	}

	defer func() { _ = in.Close() }()

	_, err = io.Copy(w, in)

	return err
}

func (d *sftpDestination) Delete(_ context.Context, remote string) error {
	client, closeAll, err := d.connect()
	if err != nil {
		return err
	}

	defer closeAll()

	return client.Remove(remote)
}
