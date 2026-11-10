package serviceConnector

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"golang.org/x/oauth2"
)

// driveScope only reaches files this app created, never the rest of the user's Drive.
const driveScope = "https://www.googleapis.com/auth/drive.file"

type gdriveDestination struct {
	client   *http.Client
	folderID string
}

func newGDrive(f fields) (Destination, error) {
	conf, token, err := refreshClient(TypeGDrive, f)
	if err != nil {
		return nil, err
	}

	client := conf.Client(context.Background(), &oauth2.Token{RefreshToken: token})

	return &gdriveDestination{client: client, folderID: f.str("folderId")}, nil
}

func (d *gdriveDestination) do(ctx context.Context, req *http.Request) (*http.Response, error) {
	resp, err := d.client.Do(req.WithContext(ctx))
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 300 {
		defer func() { _ = resp.Body.Close() }()

		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))

		return nil, fmt.Errorf("google drive answered %d: %s", resp.StatusCode, bytes.TrimSpace(body))
	}

	return resp, nil
}

func (d *gdriveDestination) Test(ctx context.Context) error {
	req, _ := http.NewRequest(http.MethodGet, "https://www.googleapis.com/drive/v3/about?fields=user", nil)

	resp, err := d.do(ctx, req)
	if err != nil {
		return err
	}

	_ = resp.Body.Close()

	return nil
}

// Put starts a resumable upload and sends the file in one request, so a large
// backup is streamed and never held in memory.
func (d *gdriveDestination) Put(ctx context.Context, name string, r io.Reader, size int64) (string, error) {
	meta := map[string]any{"name": name}
	if d.folderID != "" {
		meta["parents"] = []string{d.folderID}
	}

	body, _ := json.Marshal(meta)

	start, _ := http.NewRequest(http.MethodPost, "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", bytes.NewReader(body))
	start.Header.Set("Content-Type", "application/json; charset=UTF-8")

	resp, err := d.do(ctx, start)
	if err != nil {
		return "", err
	}

	_ = resp.Body.Close()

	location := resp.Header.Get("Location")
	if location == "" {
		return "", errors.New("google drive did not return an upload location")
	}

	upload, _ := http.NewRequest(http.MethodPut, location, r)
	upload.ContentLength = size
	upload.Header.Set("Content-Type", "application/octet-stream")

	done, err := d.do(ctx, upload)
	if err != nil {
		return "", err
	}

	defer func() { _ = done.Body.Close() }()

	var created struct {
		ID string `json:"id"`
	}

	if err := json.NewDecoder(done.Body).Decode(&created); err != nil || created.ID == "" {
		return "", errors.New("google drive did not return a file id")
	}

	return created.ID, nil
}

func (d *gdriveDestination) Get(ctx context.Context, remote string, w io.Writer) error {
	req, _ := http.NewRequest(http.MethodGet, "https://www.googleapis.com/drive/v3/files/"+url.PathEscape(remote)+"?alt=media", nil)

	resp, err := d.do(ctx, req)
	if err != nil {
		return err
	}

	defer func() { _ = resp.Body.Close() }()

	_, err = io.Copy(w, resp.Body)

	return err
}

func (d *gdriveDestination) Delete(ctx context.Context, remote string) error {
	req, _ := http.NewRequest(http.MethodDelete, "https://www.googleapis.com/drive/v3/files/"+url.PathEscape(remote), nil)

	resp, err := d.do(ctx, req)
	if err != nil {
		return err
	}

	_ = resp.Body.Close()

	return nil
}
