package serviceAccount

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/goccy/go-json"
	"github.com/gofiber/fiber/v3/client"
)

// accountAPIVersion is the version of the website account routes this app speaks.
const accountAPIVersion = "v1"

var errWebsiteUnreachable = errors.New("could not reach the DBO account server")

// websiteEnvelope is the shape every website API response has.
type websiteEnvelope[T any] struct {
	Data T `json:"data"`
}

// websiteClient calls the account routes of the DBO website. Each method is one route.
type websiteClient struct {
	baseURL string
}

func (w websiteClient) connectStart(ctx context.Context) (*dto.AccountConnectStartResponse, error) {
	return send[dto.AccountConnectStartResponse](ctx, w, http.MethodGet, "/connect/start", nil,
		func(rawResult) error {
			return apperror.AccountRejected(http.StatusUnprocessableEntity, "account_invalid")
		})
}

// connectPoll fails with errConnectPending while the person has not confirmed on the website.
func (w websiteClient) connectPoll(ctx context.Context, req *dto.AccountConnectPollRequest) (*dto.AccountSessionResponse, error) {
	return send[dto.AccountSessionResponse](ctx, w, http.MethodPost, "/connect/poll", req, func(res rawResult) error {
		if res.status == http.StatusAccepted {
			return errConnectPending
		}

		return apperror.AccountRejected(http.StatusUnprocessableEntity, "account_connect_expired")
	})
}

var errConnectPending = errors.New("connect pending")

type rawResult struct {
	status int
}

// send calls one website route and decodes its data. reject turns a non-2xx answer into the error to return.
func send[T any](
	ctx context.Context,
	w websiteClient,
	method, path string,
	body any,
	reject func(rawResult) error,
) (*T, error) {
	cc := client.New()
	cc.SetTimeout(10 * time.Second)

	header := map[string]string{"Accept": "application/json"}

	cfg := client.Config{Ctx: ctx, Header: header}

	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, apperror.InternalServerError(err)
		}

		header["Content-Type"] = "application/json"
		cfg.Body = encoded
	}

	target := w.baseURL + "/" + accountAPIVersion + "/account" + path

	var (
		resp *client.Response
		err  error
	)

	if method == http.MethodGet {
		resp, err = cc.Get(target, cfg)
	} else {
		resp, err = cc.Post(target, cfg)
	}

	if err != nil {
		return nil, apperror.InternalServerError(errWebsiteUnreachable)
	}
	defer resp.Close()

	var envelope websiteEnvelope[T]
	_ = json.Unmarshal(resp.Body(), &envelope)

	if status := resp.StatusCode(); status != http.StatusOK && status != http.StatusCreated {
		if status >= 500 {
			return nil, apperror.InternalServerError(errWebsiteUnreachable)
		}

		return nil, reject(rawResult{status: status})
	}

	return &envelope.Data, nil
}
