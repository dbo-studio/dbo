package serviceConnector

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"
)

// webdavDestination speaks WebDAV: Nextcloud, ownCloud, Synology and most NAS boxes.
type webdavDestination struct {
	base       *url.URL // the server address, without the folder
	dir        string   // folder inside it, no leading or trailing slash
	user, pass string
	client     *http.Client
}

func newWebDAV(f fields) (Destination, error) {
	if err := f.require("url"); err != nil {
		return nil, err
	}

	u, err := url.Parse(f.str("url"))
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return nil, fmt.Errorf("url must be a full http or https address")
	}

	return &webdavDestination{
		base:   u,
		dir:    strings.Trim(f.str("path"), "/"),
		user:   f.str("username"),
		pass:   f.secret("password"),
		client: &http.Client{},
	}, nil
}

// urlOf is the address of a path below the server address.
func (d *webdavDestination) urlOf(p string) string {
	u := *d.base
	u.Path = path.Join(u.Path, p)
	u.RawPath = ""

	return u.String()
}

func (d *webdavDestination) do(ctx context.Context, method, target string, body io.Reader, size int64) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, target, body)
	if err != nil {
		return nil, err
	}

	if body != nil {
		req.ContentLength = size
	}

	if d.user != "" {
		req.SetBasicAuth(d.user, d.pass)
	}

	return d.client.Do(req)
}

// status runs a request that carries no body back and returns its status code.
func (d *webdavDestination) status(ctx context.Context, method, target string) (int, error) {
	res, err := d.do(ctx, method, target, nil, 0)
	if err != nil {
		return 0, err
	}

	_ = res.Body.Close()

	return res.StatusCode, nil
}

func statusError(what string, code int) error {
	switch code {
	case http.StatusUnauthorized, http.StatusForbidden:
		return fmt.Errorf("%s: the server refused the username or password (%d)", what, code)
	default:
		return fmt.Errorf("%s: the server answered %d", what, code)
	}
}

// ensureDir creates the folder one level at a time. A folder that already
// exists answers 405, which is fine.
func (d *webdavDestination) ensureDir(ctx context.Context) error {
	built := ""

	for _, part := range strings.Split(d.dir, "/") {
		if part == "" {
			continue
		}

		built = path.Join(built, part)

		code, err := d.status(ctx, "MKCOL", d.urlOf(built))
		if err != nil {
			return err
		}

		if code != http.StatusCreated && code != http.StatusMethodNotAllowed {
			return statusError("create folder "+built, code)
		}
	}

	return nil
}

func (d *webdavDestination) Test(ctx context.Context) error {
	if err := d.ensureDir(ctx); err != nil {
		return err
	}

	code, err := d.status(ctx, "PROPFIND", d.urlOf(d.dir))
	if err != nil {
		return err
	}

	if code != http.StatusMultiStatus && code != http.StatusOK {
		return statusError("open folder", code)
	}

	return nil
}

func (d *webdavDestination) Put(ctx context.Context, name string, r io.Reader, size int64) (string, error) {
	if err := d.ensureDir(ctx); err != nil {
		return "", err
	}

	remote := path.Join(d.dir, path.Base(name))

	res, err := d.do(ctx, http.MethodPut, d.urlOf(remote), r, size)
	if err != nil {
		return "", err
	}

	defer func() { _ = res.Body.Close() }()

	if res.StatusCode >= 300 {
		return "", statusError("upload", res.StatusCode)
	}

	return remote, nil
}

func (d *webdavDestination) Get(ctx context.Context, remote string, w io.Writer) error {
	res, err := d.do(ctx, http.MethodGet, d.urlOf(remote), nil, 0)
	if err != nil {
		return err
	}

	defer func() { _ = res.Body.Close() }()

	if res.StatusCode != http.StatusOK {
		return statusError("download", res.StatusCode)
	}

	_, err = io.Copy(w, res.Body)

	return err
}

func (d *webdavDestination) Delete(ctx context.Context, remote string) error {
	code, err := d.status(ctx, http.MethodDelete, d.urlOf(remote))
	if err != nil {
		return err
	}

	if code >= 300 && code != http.StatusNotFound {
		return statusError("delete", code)
	}

	return nil
}
