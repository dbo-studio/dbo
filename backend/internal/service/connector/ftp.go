package serviceConnector

import (
	"context"
	"crypto/tls"
	"io"
	"net"
	"path"
	"strconv"
	"time"

	"github.com/jlaffaye/ftp"
)

// ftpDestination uses plain FTP or explicit FTPS (security "explicit").
type ftpDestination struct {
	addr, user, pass, dir string
	explicitTLS           bool
	host                  string
}

func newFTP(f fields) (Destination, error) {
	if err := f.require("host", "username"); err != nil {
		return nil, err
	}

	return &ftpDestination{
		addr:        net.JoinHostPort(f.str("host"), strconv.Itoa(f.num("port", 21))),
		host:        f.str("host"),
		user:        f.str("username"),
		pass:        f.secret("password"),
		dir:         f.str("path"),
		explicitTLS: f.str("security") == "explicit",
	}, nil
}

func (d *ftpDestination) connect(ctx context.Context) (*ftp.ServerConn, error) {
	opts := []ftp.DialOption{ftp.DialWithTimeout(15 * time.Second), ftp.DialWithContext(ctx)}
	if d.explicitTLS {
		opts = append(opts, ftp.DialWithExplicitTLS(&tls.Config{ServerName: d.host, MinVersion: tls.VersionTLS12}))
	}

	conn, err := ftp.Dial(d.addr, opts...)
	if err != nil {
		return nil, err
	}

	if err := conn.Login(d.user, d.pass); err != nil {
		_ = conn.Quit()

		return nil, err
	}

	return conn, nil
}

func (d *ftpDestination) Test(ctx context.Context) error {
	conn, err := d.connect(ctx)
	if err != nil {
		return err
	}

	defer func() { _ = conn.Quit() }()

	if d.dir == "" {
		return nil
	}

	return conn.ChangeDir(d.dir)
}

func (d *ftpDestination) Put(ctx context.Context, name string, r io.Reader, _ int64) (string, error) {
	conn, err := d.connect(ctx)
	if err != nil {
		return "", err
	}

	defer func() { _ = conn.Quit() }()

	remote := path.Join(d.dir, path.Base(name))

	return remote, conn.Stor(remote, r)
}

func (d *ftpDestination) Get(ctx context.Context, remote string, w io.Writer) error {
	conn, err := d.connect(ctx)
	if err != nil {
		return err
	}

	defer func() { _ = conn.Quit() }()

	resp, err := conn.Retr(remote)
	if err != nil {
		return err
	}

	defer func() { _ = resp.Close() }()

	_, err = io.Copy(w, resp)

	return err
}

func (d *ftpDestination) Delete(ctx context.Context, remote string) error {
	conn, err := d.connect(ctx)
	if err != nil {
		return err
	}

	defer func() { _ = conn.Quit() }()

	return conn.Delete(remote)
}
