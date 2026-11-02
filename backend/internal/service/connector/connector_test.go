package serviceConnector

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestFolderDestinationRoundTrip(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()

	d, err := OpenDestination(TypeFolder, fields{config: map[string]any{"path": dir}})
	if err != nil {
		t.Fatal(err)
	}

	if err := d.Test(ctx); err != nil {
		t.Fatal(err)
	}

	// A name that tries to climb out of the folder lands inside it.
	remote, err := d.Put(ctx, "../../evil.sql", strings.NewReader("data"), 4)
	if err != nil {
		t.Fatal(err)
	}

	if filepath.Dir(remote) != dir {
		t.Fatalf("file escaped the folder: %s", remote)
	}

	var got bytes.Buffer
	if err := d.Get(ctx, remote, &got); err != nil || got.String() != "data" {
		t.Fatalf("get: %q, %v", got.String(), err)
	}

	if err := d.Delete(ctx, remote); err != nil {
		t.Fatal(err)
	}

	if _, err := os.Stat(remote); !os.IsNotExist(err) {
		t.Fatal("file still exists")
	}
}

func TestEventTextHidesErrorUnlessAsked(t *testing.T) {
	e := Event{Kind: "backup", Name: "nightly", Failed: true, Error: "dial tcp 10.0.0.5: secret detail"}

	if strings.Contains(e.text(false), "secret detail") {
		t.Fatal("error leaked without opt-in")
	}

	if !strings.Contains(e.text(true), "secret detail") {
		t.Fatal("error missing with opt-in")
	}
}

func TestWebhookChannelSignsAndOmitsError(t *testing.T) {
	var body map[string]any

	var sig string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sig = r.Header.Get("X-DBO-Signature")
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &body)
	}))
	defer srv.Close()

	s := &service{allowInternal: true}
	f := fields{config: map[string]any{"url": srv.URL}, secrets: map[string]string{"signingSecret": "k"}}

	err := s.send(context.Background(), TypeWebhook, f, Event{Kind: "backup", Name: "n", Failed: true, Error: "boom", At: time.Now()})
	if err != nil {
		t.Fatal(err)
	}

	if !strings.HasPrefix(sig, "sha256=") {
		t.Fatalf("missing signature: %q", sig)
	}

	if body["event"] != "backup.failed" {
		t.Fatalf("event: %v", body["event"])
	}

	if _, has := body["error"]; has {
		t.Fatal("error included without opt-in")
	}
}

func TestWebhookRefusesPrivateAddressWhenSignedInServer(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	defer srv.Close()

	s := &service{allowInternal: false}
	f := fields{config: map[string]any{"url": srv.URL}}

	if err := s.send(context.Background(), TypeWebhook, f, Event{Kind: "backup", At: time.Now()}); err == nil {
		t.Fatal("expected the loopback target to be refused")
	}
}

func TestSecretsAreNotReturned(t *testing.T) {
	s := &service{cipherKey: bytes.Repeat([]byte{1}, 32)}
	c := newConnectorForTest(t, s, TypeS3, map[string]any{"bucket": "b"}, map[string]string{"accessKey": "AK", "secretKey": "SK"})

	raw, _ := json.Marshal(s.response(c))
	if strings.Contains(string(raw), "AK") || strings.Contains(string(raw), "SK") {
		t.Fatalf("secret leaked in response: %s", raw)
	}

	if !s.response(c).SecretsSet["accessKey"] {
		t.Fatal("secretsSet should flag accessKey")
	}
}

func TestTestDraftChecksWithoutSaving(t *testing.T) {
	// A nil repo would panic on any save or lookup: a draft must touch neither.
	s := &service{}
	good := &dto.ConnectorRequest{Type: TypeFolder, Name: "x", Config: map[string]any{"path": t.TempDir()}}

	if err := s.TestDraft(context.Background(), model.ConnectorKindDestination, good); err != nil {
		t.Fatalf("working folder failed: %v", err)
	}

	bad := &dto.ConnectorRequest{Type: TypeFolder, Name: "x", Config: map[string]any{"path": "/nonexistent-dbo-dir/a/b"}}
	if err := s.TestDraft(context.Background(), model.ConnectorKindDestination, bad); err == nil {
		t.Fatal("unwritable folder passed the test")
	}
}

// davServer is a tiny in-memory WebDAV: folders by MKCOL, files by PUT.
func davServer() *httptest.Server {
	files := map[string]string{}
	dirs := map[string]bool{"/": true}

	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if u, p, ok := r.BasicAuth(); !ok || u != "me" || p != "pw" {
			w.WriteHeader(http.StatusUnauthorized)

			return
		}

		switch r.Method {
		case "MKCOL":
			if dirs[r.URL.Path] {
				w.WriteHeader(http.StatusMethodNotAllowed)

				return
			}

			dirs[r.URL.Path] = true
			w.WriteHeader(http.StatusCreated)
		case "PROPFIND":
			if !dirs[r.URL.Path] {
				w.WriteHeader(http.StatusNotFound)

				return
			}

			w.WriteHeader(http.StatusMultiStatus)
		case http.MethodPut:
			raw, _ := io.ReadAll(r.Body)
			files[r.URL.Path] = string(raw)
			w.WriteHeader(http.StatusCreated)
		case http.MethodGet:
			body, ok := files[r.URL.Path]
			if !ok {
				w.WriteHeader(http.StatusNotFound)

				return
			}

			_, _ = io.WriteString(w, body)
		case http.MethodDelete:
			delete(files, r.URL.Path)
			w.WriteHeader(http.StatusNoContent)
		}
	}))
}

func TestWebDAVDestinationRoundTrip(t *testing.T) {
	srv := davServer()
	defer srv.Close()

	ctx := context.Background()
	f := fields{config: map[string]any{"url": srv.URL, "username": "me", "path": "/backups/db"}, secrets: map[string]string{"password": "pw"}}

	d, err := OpenDestination(TypeWebDAV, f)
	if err != nil {
		t.Fatal(err)
	}

	if err := d.Test(ctx); err != nil {
		t.Fatal(err)
	}

	remote, err := d.Put(ctx, "../x.sql", strings.NewReader("data"), 4)
	if err != nil || remote != "backups/db/x.sql" {
		t.Fatalf("put: %q, %v", remote, err)
	}

	var got bytes.Buffer
	if err := d.Get(ctx, remote, &got); err != nil || got.String() != "data" {
		t.Fatalf("get: %q, %v", got.String(), err)
	}

	if err := d.Delete(ctx, remote); err != nil {
		t.Fatal(err)
	}

	f.secrets["password"] = "wrong"

	bad, _ := OpenDestination(TypeWebDAV, f)
	if err := bad.Test(ctx); err == nil || !strings.Contains(err.Error(), "refused") {
		t.Fatalf("wrong password: %v", err)
	}
}

func TestS3ObjectLockSettings(t *testing.T) {
	f := fields{config: map[string]any{"bucket": "b", "lockDays": float64(30), "lockMode": "compliance"}, secrets: map[string]string{"accessKey": "a", "secretKey": "s"}}

	d, err := newS3(f)
	if err != nil {
		t.Fatal(err)
	}

	got := d.(*s3Destination)
	if got.lockDays != 30 || got.lockMode != "COMPLIANCE" {
		t.Fatalf("lock: %d days, mode %q", got.lockDays, got.lockMode)
	}

	f.config["lockMode"] = ""
	plain, _ := newS3(f)

	if plain.(*s3Destination).lockMode != "GOVERNANCE" {
		t.Fatal("the default mode must be the reversible one")
	}
}
