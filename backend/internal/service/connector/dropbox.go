package serviceConnector

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path"
	"strings"

	"golang.org/x/oauth2"
)

const (
	dropboxAPI     = "https://api.dropboxapi.com/2/"
	dropboxContent = "https://content.dropboxapi.com/2/"
	// dropboxChunk is how much of a backup goes in each request of an upload session.
	dropboxChunk = 8 << 20
)

// dropboxDestination stores backups in the app's own folder of a Dropbox account.
type dropboxDestination struct {
	client       *http.Client
	api, content string
	dir          string
}

func newDropbox(f fields) (Destination, error) {
	conf, token, err := refreshClient(TypeDropbox, f)
	if err != nil {
		return nil, err
	}

	return &dropboxDestination{
		client:  conf.Client(context.Background(), &oauth2.Token{RefreshToken: token}),
		api:     dropboxAPI,
		content: dropboxContent,
		dir:     strings.Trim(f.str("path"), "/"),
	}, nil
}

// asciiJSON escapes non-ASCII characters, which the Dropbox-API-Arg header cannot carry raw.
func asciiJSON(v any) string {
	raw, _ := json.Marshal(v)

	var b strings.Builder

	for _, r := range string(raw) {
		if r < 0x80 {
			b.WriteRune(r)
		} else if r > 0xFFFF {
			r -= 0x10000
			fmt.Fprintf(&b, `\u%04x\u%04x`, 0xD800+(r>>10), 0xDC00+(r&0x3FF))
		} else {
			fmt.Fprintf(&b, `\u%04x`, r)
		}
	}

	return b.String()
}

// call runs one Dropbox request. arg goes in the header for content endpoints and in the body for
// API ones, as Dropbox expects. A failed request comes back as an error with Dropbox's reason.
func (d *dropboxDestination) call(ctx context.Context, content bool, endpoint string, arg any, body io.Reader, size int64) (*http.Response, error) {
	base := d.api
	if content {
		base = d.content
	}

	var reader io.Reader = body

	if !content && arg != nil {
		raw, _ := json.Marshal(arg)
		reader, size = bytes.NewReader(raw), int64(len(raw))
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+endpoint, reader)
	if err != nil {
		return nil, err
	}

	switch {
	case content:
		req.Header.Set("Dropbox-API-Arg", asciiJSON(arg))
		req.Header.Set("Content-Type", "application/octet-stream")
	case arg != nil:
		req.Header.Set("Content-Type", "application/json")
	}

	if reader != nil {
		req.ContentLength = size
	}

	res, err := d.client.Do(req)
	if err != nil {
		return nil, err
	}

	if res.StatusCode >= 300 {
		defer func() { _ = res.Body.Close() }()

		msg, _ := io.ReadAll(io.LimitReader(res.Body, 512))

		return nil, fmt.Errorf("dropbox answered %d: %s", res.StatusCode, bytes.TrimSpace(msg))
	}

	return res, nil
}

func (d *dropboxDestination) Test(ctx context.Context) error {
	res, err := d.call(ctx, false, "users/get_current_account", nil, nil, 0)
	if err != nil {
		return err
	}

	_ = res.Body.Close()

	return nil
}

// Put uploads in chunks through an upload session, so a large backup is streamed and never held in memory.
func (d *dropboxDestination) Put(ctx context.Context, name string, r io.Reader, size int64) (string, error) {
	remote := "/" + path.Join(d.dir, path.Base(name))
	commit := map[string]any{"path": remote, "mode": "overwrite", "mute": true}

	buf := make([]byte, dropboxChunk)

	n, err := io.ReadFull(r, buf)
	if err == io.EOF || err == io.ErrUnexpectedEOF {
		// The whole file fit in one chunk.
		res, err := d.call(ctx, true, "files/upload", commit, bytes.NewReader(buf[:n]), int64(n))
		if err != nil {
			return "", err
		}

		_ = res.Body.Close()

		return remote, nil
	}

	if err != nil {
		return "", err
	}

	res, err := d.call(ctx, true, "files/upload_session/start", map[string]any{"close": false}, bytes.NewReader(buf[:n]), int64(n))
	if err != nil {
		return "", err
	}

	var started struct {
		SessionID string `json:"session_id"`
	}

	err = json.NewDecoder(res.Body).Decode(&started)
	_ = res.Body.Close()

	if err != nil || started.SessionID == "" {
		return "", fmt.Errorf("dropbox did not return an upload session")
	}

	offset := int64(n)

	for {
		n, err = io.ReadFull(r, buf)
		last := err == io.EOF || err == io.ErrUnexpectedEOF

		if err != nil && !last {
			return "", err
		}

		cursor := map[string]any{"session_id": started.SessionID, "offset": offset}

		if last {
			res, err := d.call(ctx, true, "files/upload_session/finish", map[string]any{"cursor": cursor, "commit": commit}, bytes.NewReader(buf[:n]), int64(n))
			if err != nil {
				return "", err
			}

			_ = res.Body.Close()

			return remote, nil
		}

		res, err := d.call(ctx, true, "files/upload_session/append_v2", map[string]any{"cursor": cursor, "close": false}, bytes.NewReader(buf[:n]), int64(n))
		if err != nil {
			return "", err
		}

		_ = res.Body.Close()

		offset += int64(n)
	}
}

func (d *dropboxDestination) Get(ctx context.Context, remote string, w io.Writer) error {
	res, err := d.call(ctx, true, "files/download", map[string]any{"path": remote}, nil, 0)
	if err != nil {
		return err
	}

	defer func() { _ = res.Body.Close() }()

	_, err = io.Copy(w, res.Body)

	return err
}

func (d *dropboxDestination) Delete(ctx context.Context, remote string) error {
	res, err := d.call(ctx, false, "files/delete_v2", map[string]any{"path": remote}, nil, 0)
	if err != nil {
		// A file that is already gone is what a delete wants.
		if strings.Contains(err.Error(), "not_found") {
			return nil
		}

		return err
	}

	_ = res.Body.Close()

	return nil
}
