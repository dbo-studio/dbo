package serviceConnector

import (
	"context"
	"io"
	"os"
	"path/filepath"
)

// folderDestination copies backups into another directory, such as a mounted NAS share.
type folderDestination struct{ dir string }

func newFolder(f fields) (Destination, error) {
	dir := filepath.Clean(f.str("path"))
	if f.str("path") == "" || !filepath.IsAbs(dir) {
		return nil, errMissingField("an absolute path")
	}

	return &folderDestination{dir: dir}, nil
}

func (d *folderDestination) Test(context.Context) error {
	if err := os.MkdirAll(d.dir, 0o700); err != nil {
		return err
	}

	probe, err := os.CreateTemp(d.dir, ".dbo-test-*")
	if err != nil {
		return err
	}

	_ = probe.Close()

	return os.Remove(probe.Name())
}

func (d *folderDestination) Put(_ context.Context, name string, r io.Reader, _ int64) (string, error) {
	if err := os.MkdirAll(d.dir, 0o700); err != nil {
		return "", err
	}

	// Base() keeps a file name from climbing out of the directory.
	path := filepath.Join(d.dir, filepath.Base(name))

	out, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return "", err
	}

	if _, err := io.Copy(out, r); err != nil {
		_ = out.Close()
		_ = os.Remove(path)

		return "", err
	}

	return path, out.Close()
}

func (d *folderDestination) Get(_ context.Context, remote string, w io.Writer) error {
	f, err := os.Open(d.within(remote))
	if err != nil {
		return err
	}

	defer func() { _ = f.Close() }()

	_, err = io.Copy(w, f)

	return err
}

func (d *folderDestination) Delete(_ context.Context, remote string) error {
	return os.Remove(d.within(remote))
}

// within pins a stored path to the configured directory.
func (d *folderDestination) within(remote string) string {
	return filepath.Join(d.dir, filepath.Base(remote))
}
