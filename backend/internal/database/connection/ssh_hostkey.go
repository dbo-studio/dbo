package databaseConnection

import (
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"sync"

	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/knownhosts"
)

var sshKnownHostsMu sync.Mutex

// sshKnownHostsPath returns the file holding trusted SSH host keys. Override
// with SSH_KNOWN_HOSTS_PATH.
func sshKnownHostsPath() string {
	if override := os.Getenv("SSH_KNOWN_HOSTS_PATH"); override != "" {
		return override
	}

	if dir, err := os.UserConfigDir(); err == nil {
		return filepath.Join(dir, "dbo", "ssh_known_hosts")
	}

	return filepath.Join("data", "ssh_known_hosts")
}

// sshHostKeyCallback verifies server keys trust-on-first-use: an unseen host is
// recorded, a known host whose key changed is rejected.
func sshHostKeyCallback() ssh.HostKeyCallback {
	return func(host string, remote net.Addr, key ssh.PublicKey) error {
		sshKnownHostsMu.Lock()
		defer sshKnownHostsMu.Unlock()

		path := sshKnownHostsPath()

		if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
			return fmt.Errorf("ssh tunnel: known hosts: %w", err)
		}

		file, err := os.OpenFile(path, os.O_CREATE|os.O_RDONLY, 0o600)
		if err != nil {
			return fmt.Errorf("ssh tunnel: known hosts: %w", err)
		}

		_ = file.Close()

		check, err := knownhosts.New(path)
		if err != nil {
			return fmt.Errorf("ssh tunnel: known hosts: %w", err)
		}

		err = check(host, remote, key)
		if err == nil {
			return nil
		}

		var keyErr *knownhosts.KeyError
		if !errors.As(err, &keyErr) {
			return fmt.Errorf("ssh tunnel: host key check: %w", err)
		}

		if len(keyErr.Want) > 0 {
			return fmt.Errorf("ssh tunnel: host key for %s changed (possible man-in-the-middle); if the change is expected, remove its entry from %s", host, path)
		}

		out, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0o600)
		if err != nil {
			return fmt.Errorf("ssh tunnel: known hosts: %w", err)
		}
		defer out.Close()

		_, err = out.WriteString(knownhosts.Line([]string{knownhosts.Normalize(host)}, key) + "\n")

		return err
	}
}
