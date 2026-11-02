package serviceAccount

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func newService(t *testing.T, handler http.HandlerFunc) IAccountService {
	t.Helper()

	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)

	cfg := &config.Config{}
	cfg.App.WebsiteAPIURL = srv.URL

	return NewAccountService(cfg)
}

func reply(w http.ResponseWriter, status int, body string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(body))
}

func TestConnectStartCallsVersionedRoute(t *testing.T) {
	svc := newService(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/v1/account/connect/start" {
			t.Errorf("%s %s", r.Method, r.URL.Path)
		}
		reply(w, http.StatusOK, `{"data":{"code":"ABCD2345","url":"https://site/connect?code=ABCD2345"}}`)
	})

	start, err := svc.ConnectStart(context.Background())
	if err != nil || start.Code != "ABCD2345" || start.URL == "" {
		t.Fatalf("start = %+v err = %v", start, err)
	}
}

func TestConnectPollReportsPendingThenSession(t *testing.T) {
	ready := false
	svc := newService(t, func(w http.ResponseWriter, r *http.Request) {
		if !ready {
			reply(w, http.StatusAccepted, `{"error":"pending"}`)
			return
		}
		reply(w, http.StatusOK, `{"data":{"token":"tok","user":{"name":"a","email":"a@b.co","verified":true}}}`)
	})
	req := &dto.AccountConnectPollRequest{Code: "ABCD2345"}

	pending, err := svc.ConnectPoll(context.Background(), req)
	if err != nil || !pending.Pending || pending.Session != nil {
		t.Fatalf("pending = %+v err = %v", pending, err)
	}

	ready = true
	done, err := svc.ConnectPoll(context.Background(), req)
	if err != nil || done.Pending || done.Session.Token != "tok" || !done.Session.User.Verified {
		t.Fatalf("done = %+v err = %v", done, err)
	}
}

func TestConnectPollMapsExpiredCode(t *testing.T) {
	svc := newService(t, func(w http.ResponseWriter, r *http.Request) {
		reply(w, http.StatusNotFound, `{"error":"expired"}`)
	})

	_, err := svc.ConnectPoll(context.Background(), &dto.AccountConnectPollRequest{Code: "X"})
	if appErr := apperror.Resolve(err); appErr == nil || appErr.Error() != "account_connect_expired" {
		t.Fatalf("err = %v", err)
	}
}

func TestUnreachableWebsiteIsAServerError(t *testing.T) {
	cfg := &config.Config{}
	cfg.App.WebsiteAPIURL = "http://127.0.0.1:1"

	_, err := NewAccountService(cfg).ConnectStart(context.Background())
	if appErr := apperror.Resolve(err); appErr == nil || appErr.Code != http.StatusInternalServerError {
		t.Fatalf("err = %v", err)
	}
}
