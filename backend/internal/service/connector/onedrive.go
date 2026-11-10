package serviceConnector

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"

	"golang.org/x/oauth2"
)

const (
	graphBase = "https://graph.microsoft.com/v1.0"
	// onedriveChunk must be a multiple of 320 KiB, which Microsoft Graph requires for upload sessions.
	onedriveChunk = 32 * 320 << 10
)

// onedriveDestination stores backups in the app's own folder of a OneDrive account.
type onedriveDestination struct {
	client *http.Client // signs requests
	plain  *http.Client // for pre-authorized URLs, which refuse a bearer token
	base   string
	dir    string
}

func newOneDrive(f fields) (Destination, error) {
	conf, token, err := refreshClient(TypeOneDrive, f)
	if err != nil {
		return nil, err
	}

	signed := conf.Client(context.Background(), &oauth2.Token{RefreshToken: token})
	// Downloads answer with a redirect to a pre-authorized URL; follow it without the token.
	signed.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }

	return &onedriveDestination{client: signed, plain: &http.Client{}, base: graphBase, dir: strings.Trim(f.str("path"), "/")}, nil
}

func (d *onedriveDestination) request(ctx context.Context, c *http.Client, method, target string, body io.Reader, headers map[string]string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, target, body)
	if err != nil {
		return nil, err
	}

	for k, v := range headers {
		req.Header.Set(k, v)
	}

	return c.Do(req)
}

func failed(what string, res *http.Response) error {
	defer func() { _ = res.Body.Close() }()

	msg, _ := io.ReadAll(io.LimitReader(res.Body, 512))

	return fmt.Errorf("onedrive %s answered %d: %s", what, res.StatusCode, bytes.TrimSpace(msg))
}

// appPath is an item below the app folder, as a Graph address.
func (d *onedriveDestination) appPath(name string) string {
	return d.base + "/me/drive/special/approot:/" + (&url.URL{Path: path.Join(d.dir, name)}).EscapedPath()
}

func (d *onedriveDestination) Test(ctx context.Context) error {
	res, err := d.request(ctx, d.client, http.MethodGet, d.base+"/me/drive/special/approot", nil, nil)
	if err != nil {
		return err
	}

	if res.StatusCode >= 300 {
		return failed("test", res)
	}

	_ = res.Body.Close()

	return nil
}

// Put sends the file through an upload session in chunks, so a large backup is streamed and never held in memory.
func (d *onedriveDestination) Put(ctx context.Context, name string, r io.Reader, size int64) (string, error) {
	body := strings.NewReader(`{"item":{"@microsoft.graph.conflictBehavior":"replace"}}`)

	res, err := d.request(ctx, d.client, http.MethodPost, d.appPath(path.Base(name))+":/createUploadSession", body, map[string]string{"Content-Type": "application/json"})
	if err != nil {
		return "", err
	}

	if res.StatusCode >= 300 {
		return "", failed("upload session", res)
	}

	var session struct {
		UploadURL string `json:"uploadUrl"`
	}

	err = json.NewDecoder(res.Body).Decode(&session)
	_ = res.Body.Close()

	if err != nil || session.UploadURL == "" {
		return "", fmt.Errorf("onedrive did not return an upload address")
	}

	buf := make([]byte, onedriveChunk)

	for offset := int64(0); ; {
		n, err := io.ReadFull(r, buf)
		if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
			return "", err
		}

		if n == 0 {
			return "", fmt.Errorf("onedrive upload ended before the file did")
		}

		res, err := d.request(ctx, d.plain, http.MethodPut, session.UploadURL, bytes.NewReader(buf[:n]), map[string]string{
			"Content-Range": fmt.Sprintf("bytes %d-%d/%d", offset, offset+int64(n)-1, size),
		})
		if err != nil {
			return "", err
		}

		offset += int64(n)

		if res.StatusCode == http.StatusOK || res.StatusCode == http.StatusCreated {
			var item struct {
				ID string `json:"id"`
			}

			err = json.NewDecoder(res.Body).Decode(&item)
			_ = res.Body.Close()

			if err != nil || item.ID == "" {
				return "", fmt.Errorf("onedrive did not return a file id")
			}

			return item.ID, nil
		}

		if res.StatusCode != http.StatusAccepted {
			return "", failed("upload", res)
		}

		_ = res.Body.Close()
	}
}

func (d *onedriveDestination) Get(ctx context.Context, remote string, w io.Writer) error {
	res, err := d.request(ctx, d.client, http.MethodGet, d.base+"/me/drive/items/"+url.PathEscape(remote)+"/content", nil, nil)
	if err != nil {
		return err
	}

	if res.StatusCode == http.StatusFound || res.StatusCode == http.StatusTemporaryRedirect {
		location := res.Header.Get("Location")
		_ = res.Body.Close()

		if res, err = d.request(ctx, d.plain, http.MethodGet, location, nil, nil); err != nil {
			return err
		}
	}

	if res.StatusCode != http.StatusOK {
		return failed("download", res)
	}

	defer func() { _ = res.Body.Close() }()

	_, err = io.Copy(w, res.Body)

	return err
}

func (d *onedriveDestination) Delete(ctx context.Context, remote string) error {
	res, err := d.request(ctx, d.client, http.MethodDelete, d.base+"/me/drive/items/"+url.PathEscape(remote), nil, nil)
	if err != nil {
		return err
	}

	if res.StatusCode >= 300 && res.StatusCode != http.StatusNotFound {
		return failed("delete", res)
	}

	_ = res.Body.Close()

	return nil
}
