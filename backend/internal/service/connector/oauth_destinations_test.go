package serviceConnector

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func bigPayload(n int) []byte {
	b := make([]byte, n)
	for i := range b {
		b[i] = byte(i * 7)
	}

	return b
}

func TestDropboxChunkedRoundTrip(t *testing.T) {
	var session bytes.Buffer

	var stored []byte

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ep := strings.TrimPrefix(r.URL.Path, "/2/")
		raw, _ := io.ReadAll(r.Body)

		var arg map[string]any
		if h := r.Header.Get("Dropbox-API-Arg"); h != "" {
			_ = json.Unmarshal([]byte(h), &arg)
		} else if len(raw) > 0 && ep != "files/upload" {
			_ = json.Unmarshal(raw, &arg)
		}

		switch ep {
		case "users/get_current_account":
			_, _ = io.WriteString(w, "{}")
		case "files/upload_session/start":
			session.Reset()
			session.Write(raw)
			_, _ = io.WriteString(w, `{"session_id":"s1"}`)
		case "files/upload_session/append_v2":
			session.Write(raw)
		case "files/upload_session/finish":
			session.Write(raw)
			stored = append([]byte(nil), session.Bytes()...)

			if got := arg["commit"].(map[string]any)["path"]; got != "/dbo/db.sql" {
				t.Errorf("commit path %v", got)
			}
		case "files/download":
			_, _ = w.Write(stored)
		case "files/delete_v2":
			stored = nil
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	d := &dropboxDestination{client: srv.Client(), api: srv.URL + "/2/", content: srv.URL + "/2/", dir: "dbo"}
	ctx := context.Background()

	if err := d.Test(ctx); err != nil {
		t.Fatal(err)
	}

	data := bigPayload(dropboxChunk*2 + 123) // three requests: start, append, finish

	remote, err := d.Put(ctx, "db.sql", bytes.NewReader(data), int64(len(data)))
	if err != nil || remote != "/dbo/db.sql" {
		t.Fatalf("put: %q, %v", remote, err)
	}

	var got bytes.Buffer
	if err := d.Get(ctx, remote, &got); err != nil || !bytes.Equal(got.Bytes(), data) {
		t.Fatalf("download differs from upload: %v", err)
	}

	if err := d.Delete(ctx, remote); err != nil {
		t.Fatal(err)
	}
}

func TestDropboxArgIsASCII(t *testing.T) {
	got := asciiJSON(map[string]string{"path": "/نسخه/😀.sql"})
	for _, r := range got {
		if r > 0x7f {
			t.Fatalf("non-ASCII in header value: %s", got)
		}
	}

	var back map[string]string
	if err := json.Unmarshal([]byte(got), &back); err != nil || back["path"] != "/نسخه/😀.sql" {
		t.Fatalf("round trip: %v %v", back, err)
	}
}

func TestOneDriveSessionUploadAndRedirectedDownload(t *testing.T) {
	var uploaded []byte

	var srv *httptest.Server

	srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, ":/createUploadSession"):
			_, _ = fmt.Fprintf(w, `{"uploadUrl":"%s/up"}`, srv.URL)
		case r.URL.Path == "/up":
			if r.Header.Get("Authorization") != "" {
				t.Error("the upload address must not get a bearer token")
			}

			raw, _ := io.ReadAll(r.Body)
			uploaded = append(uploaded, raw...)

			var start, end, total int
			_, _ = fmt.Sscanf(r.Header.Get("Content-Range"), "bytes %d-%d/%d", &start, &end, &total)

			if end+1 == total {
				w.WriteHeader(http.StatusCreated)
				_, _ = io.WriteString(w, `{"id":"item1"}`)

				return
			}

			w.WriteHeader(http.StatusAccepted)
		case r.URL.Path == "/me/drive/items/item1/content":
			http.Redirect(w, r, srv.URL+"/dl", http.StatusFound)
		case r.URL.Path == "/dl":
			_, _ = w.Write(uploaded)
		case r.Method == http.MethodDelete:
			w.WriteHeader(http.StatusNoContent)
		case r.URL.Path == "/me/drive/special/approot":
			_, _ = io.WriteString(w, "{}")
		}
	}))
	defer srv.Close()

	c := srv.Client()
	c.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	d := &onedriveDestination{client: c, plain: &http.Client{}, base: srv.URL, dir: "dbo"}
	ctx := context.Background()

	if err := d.Test(ctx); err != nil {
		t.Fatal(err)
	}

	data := bigPayload(onedriveChunk*2 + 5)

	id, err := d.Put(ctx, "db.sql", bytes.NewReader(data), int64(len(data)))
	if err != nil || id != "item1" {
		t.Fatalf("put: %q, %v", id, err)
	}

	var got bytes.Buffer
	if err := d.Get(ctx, id, &got); err != nil || !bytes.Equal(got.Bytes(), data) {
		t.Fatalf("download differs from upload: %v", err)
	}

	if err := d.Delete(ctx, id); err != nil {
		t.Fatal(err)
	}

	if onedriveChunk%(320<<10) != 0 {
		t.Fatal("chunk size must be a multiple of 320 KiB")
	}
}

func TestOAuthConfigPrefersOwnAppThenBuiltin(t *testing.T) {
	t.Setenv("DBO_OAUTH_DROPBOX_CLIENT_ID", "builtin-id")

	own, err := oauthConfig(TypeDropbox, fields{secrets: map[string]string{"clientId": "mine"}}, "http://127.0.0.1:1/cb")
	if err != nil || own.ClientID != "mine" {
		t.Fatalf("own app: %v %v", own, err)
	}

	builtin, err := oauthConfig(TypeDropbox, fields{}, "")
	if err != nil || builtin.ClientID != "builtin-id" {
		t.Fatalf("built-in app: %v %v", builtin, err)
	}

	if _, err := oauthConfig(TypeOneDrive, fields{}, ""); err == nil {
		t.Fatal("a provider with no app configured must say so")
	}

	if !BuiltinAvailable(TypeDropbox) || BuiltinAvailable(TypeOneDrive) {
		t.Fatal("availability must follow what is configured")
	}

}
