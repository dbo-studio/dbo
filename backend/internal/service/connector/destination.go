package serviceConnector

import (
	"context"
	"errors"
	"fmt"
	"io"
)

// Destination types a backup can be sent to.
const (
	TypeFolder = "folder"
	TypeS3     = "s3"
	TypeSFTP   = "sftp"
	TypeFTP    = "ftp"
	TypeGDrive = "gdrive"
)

// Channel types a backup result can be announced on.
const (
	TypeEmail    = "email"
	TypeSlack    = "slack"
	TypeDiscord  = "discord"
	TypeTelegram = "telegram"
	TypeWebhook  = "webhook"
)

var (
	ErrUnknownType  = errors.New("unknown connector type")
	ErrNotUsable    = errors.New("this destination is not set up yet")
	errMissingField = func(name string) error { return fmt.Errorf("%s is required", name) }
)

// Destination is a remote place backup files are copied to. remote is whatever
// the destination needs to find the file again: an object key, a path or a file id.
type Destination interface {
	Test(ctx context.Context) error
	Put(ctx context.Context, name string, r io.Reader, size int64) (remote string, err error)
	Get(ctx context.Context, remote string, w io.Writer) error
	Delete(ctx context.Context, remote string) error
}

// fields reads typed values from a connector's config and secrets.
type fields struct {
	config  map[string]any
	secrets map[string]string
}

func (f fields) str(key string) string {
	v, _ := f.config[key].(string)

	return v
}

func (f fields) num(key string, fallback int) int {
	if v, ok := f.config[key].(float64); ok && v > 0 {
		return int(v)
	}

	return fallback
}

func (f fields) flag(key string) bool {
	v, _ := f.config[key].(bool)

	return v
}

func (f fields) secret(key string) string { return f.secrets[key] }

func (f fields) require(keys ...string) error {
	for _, k := range keys {
		if f.str(k) == "" && f.secret(k) == "" {
			return errMissingField(k)
		}
	}

	return nil
}

// OpenDestination builds the driver for a destination connector.
func OpenDestination(connType string, f fields) (Destination, error) {
	switch connType {
	case TypeFolder:
		return newFolder(f)
	case TypeS3:
		return newS3(f)
	case TypeSFTP:
		return newSFTP(f)
	case TypeFTP:
		return newFTP(f)
	case TypeGDrive:
		return newGDrive(f)
	default:
		return nil, ErrUnknownType
	}
}

// countingReader reports bytes read so a caller can draw upload progress.
type countingReader struct {
	r        io.Reader
	done     int64
	progress func(done int64)
}

func (c *countingReader) Read(p []byte) (int, error) {
	n, err := c.r.Read(p)
	c.done += int64(n)

	if c.progress != nil {
		c.progress(c.done)
	}

	return n, err
}
