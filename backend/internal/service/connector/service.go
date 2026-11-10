package serviceConnector

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"slices"
	"time"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cryptoutil"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
	"golang.org/x/oauth2"
)

// IConnectorService manages the places backups are sent and the channels that
// announce them, and does the sending.
type IConnectorService interface {
	List(ctx context.Context, kind string) ([]dto.ConnectorResponse, error)
	Create(ctx context.Context, kind string, req *dto.ConnectorRequest) (*dto.ConnectorResponse, error)
	Update(ctx context.Context, kind string, req *dto.ConnectorRequest) (*dto.ConnectorResponse, error)
	Delete(ctx context.Context, kind string, id uint) error
	Test(ctx context.Context, kind string, id uint) error
	// TestDraft checks a connector as typed in the form, before it is saved. A request id
	// of an existing connector lets saved secrets stand in for ones left blank.
	TestDraft(ctx context.Context, kind string, req *dto.ConnectorRequest) error
	OAuthURL(ctx context.Context, id uint, redirect string) (string, error)
	// OAuthExchange stores the refresh token and returns the destination's type, for the confirmation page.
	OAuthExchange(ctx context.Context, state, code string) (string, error)
	OAuthProviders() map[string]bool

	// Upload copies a finished backup file to a destination and returns its remote reference.
	Upload(ctx context.Context, ownerID string, destinationID uint, localPath, name string, progress func(done, total int64)) (string, error)
	// Fetch copies a remote backup back to localPath.
	Fetch(ctx context.Context, ownerID string, destinationID uint, remote, localPath string) error
	// Remove deletes a remote backup copy.
	Remove(ctx context.Context, ownerID string, destinationID uint, remote string) error
	// Notify tells each channel about an event; failures are logged, never returned.
	Notify(ctx context.Context, ownerID string, channelIDs []uint, e Event)
}

type service struct {
	repo          repository.IBackupConnectorRepo
	dashboardRepo repository.IDashboardSubscriptionRepo
	cipherKey     []byte
	allowInternal bool
	desktop       bool // the built-in OAuth apps are for the desktop app only
	logger        logger.Logger
}

func NewService(repo repository.IBackupConnectorRepo, dashboardRepo repository.IDashboardSubscriptionRepo, cfg *config.Config, cipherKey []byte, log logger.Logger) IConnectorService {
	// With sign-in on, other people use this server: keep webhooks from being aimed at its own network.
	allow := cfg == nil || cfg.App.Client == config.ClientDesktop || cfg.App.Auth.Mode == config.AuthModeNone

	return &service{repo: repo, dashboardRepo: dashboardRepo, cipherKey: cipherKey, allowInternal: allow, desktop: cfg == nil || cfg.App.Client == config.ClientDesktop, logger: log}
}

type typeSpec struct {
	kind            string
	config, secrets []string
}

// specs fixes which keys each type may store, so a request cannot park arbitrary data in a row.
var specs = map[string]typeSpec{
	TypeFolder:   {model.ConnectorKindDestination, []string{"path"}, nil},
	TypeS3:       {model.ConnectorKindDestination, []string{"endpoint", "region", "bucket", "prefix", "insecure", "lockDays", "lockMode"}, []string{"accessKey", "secretKey"}},
	TypeSFTP:     {model.ConnectorKindDestination, []string{"host", "port", "username", "path", "hostKey"}, []string{"password", "privateKey"}},
	TypeFTP:      {model.ConnectorKindDestination, []string{"host", "port", "username", "path", "security"}, []string{"password"}},
	TypeWebDAV:   {model.ConnectorKindDestination, []string{"url", "username", "path"}, []string{"password"}},
	TypeDropbox:  {model.ConnectorKindDestination, []string{"path"}, []string{"clientId", "clientSecret", "refreshToken"}},
	TypeOneDrive: {model.ConnectorKindDestination, []string{"path"}, []string{"clientId", "refreshToken"}},
	TypeGDrive:   {model.ConnectorKindDestination, []string{"folderId"}, []string{"clientId", "clientSecret", "refreshToken"}},
	TypeEmail:    {model.ConnectorKindChannel, []string{"recipients", "includeError"}, nil},
	TypeSlack:    {model.ConnectorKindChannel, []string{"includeError"}, []string{"webhookUrl"}},
	TypeDiscord:  {model.ConnectorKindChannel, []string{"includeError"}, []string{"webhookUrl"}},
	TypeTelegram: {model.ConnectorKindChannel, []string{"chatId", "includeError"}, []string{"botToken"}},
	TypeWebhook:  {model.ConnectorKindChannel, []string{"url", "includeError"}, []string{"signingSecret"}},
}

var (
	errNotFound = errors.New("not found")
	errBadType  = errors.New("this type is not available here")
)

func (s *service) find(ctx context.Context, kind string, id uint) (*model.BackupConnector, error) {
	c, err := s.repo.FindByOwner(ctx, id, helper.CtxOwnerID(ctx))
	if err != nil || c.Kind != kind {
		return nil, apperror.NotFound(errNotFound)
	}

	return c, nil
}

func (s *service) secretsOf(c *model.BackupConnector) (map[string]string, error) {
	out := map[string]string{}
	if c.SecretsEnc == "" {
		return out, nil
	}

	plain, err := cryptoutil.DecryptAESGCM(s.cipherKey, c.SecretsEnc)
	if err != nil {
		return nil, errors.New("saved secrets cannot be read; enter them again")
	}

	return out, json.Unmarshal(plain, &out)
}

func (s *service) fieldsOf(c *model.BackupConnector) (fields, error) {
	secrets, err := s.secretsOf(c)
	if err != nil {
		return fields{}, err
	}

	cfg := map[string]any{}
	_ = json.Unmarshal([]byte(c.Config), &cfg)

	return fields{config: cfg, secrets: secrets}, nil
}

func (s *service) response(c *model.BackupConnector) dto.ConnectorResponse {
	f, _ := s.fieldsOf(c)

	set := map[string]bool{}
	for _, k := range specs[c.Type].secrets {
		set[k] = f.secrets[k] != ""
	}

	return dto.ConnectorResponse{ID: c.ID, Kind: c.Kind, Type: c.Type, Name: c.Name, Enabled: c.Enabled, Config: f.config, SecretsSet: set}
}

func (s *service) List(ctx context.Context, kind string) ([]dto.ConnectorResponse, error) {
	list, err := s.repo.ListByOwner(ctx, helper.CtxOwnerID(ctx), kind)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	out := make([]dto.ConnectorResponse, 0, len(list))
	for i := range list {
		out = append(out, s.response(&list[i]))
	}

	return out, nil
}

// apply validates req against the type's spec and writes it to c, merging secrets.
func (s *service) apply(c *model.BackupConnector, kind string, req *dto.ConnectorRequest) error {
	spec, ok := specs[req.Type]
	if !ok || spec.kind != kind {
		return apperror.BadRequest(errBadType)
	}

	cfg := map[string]any{}
	for _, k := range spec.config {
		if v, ok := req.Config[k]; ok {
			cfg[k] = v
		}
	}

	// A pinned SFTP host key survives edits unless the host changes.
	if req.Type == TypeSFTP && c.ID != 0 {
		old := map[string]any{}
		_ = json.Unmarshal([]byte(c.Config), &old)

		if old["host"] == cfg["host"] && old["port"] == cfg["port"] {
			if _, sent := req.Config["hostKey"]; !sent {
				cfg["hostKey"] = old["hostKey"]
			}
		}
	}

	secrets, err := s.secretsOf(c)
	if err != nil {
		secrets = map[string]string{}
	}

	for k, v := range req.Secrets {
		if !slices.Contains(spec.secrets, k) {
			continue
		}

		if v != "" {
			secrets[k] = v
		}
	}

	rawCfg, _ := json.Marshal(cfg)
	c.Config = string(rawCfg)

	if len(secrets) > 0 {
		rawSecrets, _ := json.Marshal(secrets)

		enc, err := cryptoutil.EncryptAESGCM(s.cipherKey, rawSecrets)
		if err != nil {
			return apperror.InternalServerError(err)
		}

		c.SecretsEnc = enc
	}

	c.Kind, c.Type, c.Name = kind, req.Type, req.Name
	if req.Enabled != nil {
		c.Enabled = *req.Enabled
	}

	return nil
}

func (s *service) Create(ctx context.Context, kind string, req *dto.ConnectorRequest) (*dto.ConnectorResponse, error) {
	c := &model.BackupConnector{OwnerID: helper.CtxOwnerID(ctx), Enabled: true}
	if err := s.apply(c, kind, req); err != nil {
		return nil, err
	}

	if err := s.repo.Create(ctx, c); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	r := s.response(c)

	return &r, nil
}

func (s *service) Update(ctx context.Context, kind string, req *dto.ConnectorRequest) (*dto.ConnectorResponse, error) {
	c, err := s.find(ctx, kind, req.ID)
	if err != nil {
		return nil, err
	}

	if req.Type != c.Type {
		return nil, apperror.BadRequest(errBadType)
	}

	if err := s.apply(c, kind, req); err != nil {
		return nil, err
	}

	if err := s.repo.UpdateFields(ctx, c.ID, map[string]any{
		"name": c.Name, "enabled": c.Enabled, "config": c.Config, "secrets_enc": c.SecretsEnc,
	}); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	r := s.response(c)

	return &r, nil
}

func (s *service) Delete(ctx context.Context, kind string, id uint) error {
	c, err := s.find(ctx, kind, id)
	if err != nil {
		return err
	}

	if err := s.repo.Delete(ctx, c.ID); err != nil {
		return apperror.InternalServerError(err)
	}

	return nil
}

// pinner is implemented by destinations that pin a server identity.
type pinner interface{ Pinned() string }

func (s *service) open(c *model.BackupConnector) (Destination, error) {
	if !c.Enabled {
		return nil, ErrNotUsable
	}

	f, err := s.fieldsOf(c)
	if err != nil {
		return nil, err
	}

	return OpenDestination(c.Type, f)
}

// pin records an SFTP host key the first time one is seen, so later connections must match it.
func (s *service) pin(ctx context.Context, c *model.BackupConnector, d Destination) {
	p, ok := d.(pinner)
	if !ok || p.Pinned() == "" || c.ID == 0 {
		return
	}

	cfg := map[string]any{}
	_ = json.Unmarshal([]byte(c.Config), &cfg)

	if cur, _ := cfg["hostKey"].(string); cur != "" {
		return
	}

	cfg["hostKey"] = p.Pinned()
	raw, _ := json.Marshal(cfg)

	_ = s.repo.UpdateFields(ctx, c.ID, map[string]any{"config": string(raw)})
}

func (s *service) Test(ctx context.Context, kind string, id uint) error {
	c, err := s.find(ctx, kind, id)
	if err != nil {
		return err
	}

	return s.check(ctx, c)
}

func (s *service) TestDraft(ctx context.Context, kind string, req *dto.ConnectorRequest) error {
	c := &model.BackupConnector{OwnerID: helper.CtxOwnerID(ctx), Enabled: true}

	if req.ID != 0 {
		saved, err := s.find(ctx, kind, req.ID)
		if err != nil {
			return err
		}

		// A copy: apply edits it, and a test must save nothing.
		copied := *saved
		c = &copied
	}

	if err := s.apply(c, kind, req); err != nil {
		return err
	}

	c.ID = 0 // a draft pins no host key

	return s.check(ctx, c)
}

// check sends a test message through a channel or opens and probes a destination.
func (s *service) check(ctx context.Context, c *model.BackupConnector) error {
	if c.Kind == model.ConnectorKindChannel {
		f, err := s.fieldsOf(c)
		if err != nil {
			return apperror.BadRequest(err)
		}

		if err := s.send(ctx, c.Type, f, Event{Kind: "backup", Test: true, At: time.Now()}); err != nil {
			return apperror.BadRequest(err)
		}

		return nil
	}

	d, err := s.open(c)
	if err != nil {
		return apperror.BadRequest(err)
	}

	if err := d.Test(ctx); err != nil {
		return apperror.BadRequest(err)
	}

	s.pin(ctx, c, d)

	return nil
}

func (s *service) destination(ctx context.Context, ownerID string, id uint) (Destination, *model.BackupConnector, error) {
	c, err := s.repo.FindByOwner(ctx, id, ownerID)
	if err != nil || c.Kind != model.ConnectorKindDestination {
		return nil, nil, errNotFound
	}

	d, err := s.open(c)

	return d, c, err
}

func (s *service) Upload(ctx context.Context, ownerID string, destinationID uint, localPath, name string, progress func(done, total int64)) (string, error) {
	d, c, err := s.destination(ctx, ownerID, destinationID)
	if err != nil {
		return "", err
	}

	f, err := os.Open(localPath)
	if err != nil {
		return "", err
	}

	defer func() { _ = f.Close() }()

	info, err := f.Stat()
	if err != nil {
		return "", err
	}

	reader := &countingReader{r: f}
	if progress != nil {
		reader.progress = func(done int64) { progress(done, info.Size()) }
	}

	remote, err := d.Put(ctx, name, reader, info.Size())
	if err != nil {
		return "", err
	}

	s.pin(ctx, c, d)

	return remote, nil
}

func (s *service) Fetch(ctx context.Context, ownerID string, destinationID uint, remote, localPath string) error {
	d, _, err := s.destination(ctx, ownerID, destinationID)
	if err != nil {
		return err
	}

	out, err := os.OpenFile(localPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}

	if err := d.Get(ctx, remote, out); err != nil {
		_ = out.Close()
		_ = os.Remove(localPath)

		return err
	}

	return out.Close()
}

func (s *service) Remove(ctx context.Context, ownerID string, destinationID uint, remote string) error {
	d, _, err := s.destination(ctx, ownerID, destinationID)
	if err != nil {
		return err
	}

	return d.Delete(ctx, remote)
}

func (s *service) Notify(ctx context.Context, ownerID string, channelIDs []uint, e Event) {
	for _, id := range channelIDs {
		c, err := s.repo.FindByOwner(ctx, id, ownerID)
		if err != nil || c.Kind != model.ConnectorKindChannel || !c.Enabled {
			continue
		}

		f, err := s.fieldsOf(c)
		if err == nil {
			err = s.send(ctx, c.Type, f, e)
		}

		if err != nil {
			s.logger.Error(fmt.Sprintf("notification channel %d (%s): %v", c.ID, c.Type, err))
		}
	}
}

// --- OAuth sign-in (Google Drive, Dropbox, OneDrive) ---

type oauthState struct {
	ID       uint   `json:"id"`
	Owner    string `json:"owner"`
	Redirect string `json:"redirect"`
	Verifier string `json:"verifier"` // PKCE: proves the code goes to whoever asked for it
	Expires  int64  `json:"exp"`
}

// oauthConfigFor picks the OAuth app for a connector. The built-in one is for the desktop app only:
// a server has its own address, which the project cannot register ahead of time.
func (s *service) oauthConfigFor(c *model.BackupConnector, redirect string) (*oauth2.Config, error) {
	f, err := s.fieldsOf(c)
	if err != nil {
		return nil, err
	}

	if f.secret("clientId") == "" && !s.desktop {
		return nil, errNoOAuthApp
	}

	return oauthConfig(c.Type, f, redirect)
}

// OAuthProviders says which sign-in types work with one click here, with no client ID of the user's own.
func (s *service) OAuthProviders() map[string]bool {
	out := map[string]bool{}
	for t := range oauthProviders {
		out[t] = s.desktop && BuiltinAvailable(t)
	}

	return out
}

// OAuthURL starts the consent flow. The state is encrypted and expires, so the public callback can
// trust it without a session.
func (s *service) OAuthURL(ctx context.Context, id uint, redirect string) (string, error) {
	c, err := s.find(ctx, model.ConnectorKindDestination, id)
	if err != nil {
		return "", err
	}

	if !IsOAuthType(c.Type) {
		return "", apperror.BadRequest(errBadType)
	}

	conf, err := s.oauthConfigFor(c, redirect)
	if err != nil {
		return "", apperror.BadRequest(err)
	}

	verifier := oauth2.GenerateVerifier()

	raw, _ := json.Marshal(oauthState{ID: c.ID, Owner: helper.CtxOwnerID(ctx), Redirect: redirect, Verifier: verifier, Expires: time.Now().Add(10 * time.Minute).Unix()})

	state, err := cryptoutil.EncryptAESGCM(s.cipherKey, raw)
	if err != nil {
		return "", apperror.InternalServerError(err)
	}

	opts := append([]oauth2.AuthCodeOption{oauth2.S256ChallengeOption(verifier)}, oauthProviders[c.Type].authParams...)

	return conf.AuthCodeURL(state, opts...), nil
}

// OAuthExchange finishes the flow and stores the refresh token as the destination's secret.
func (s *service) OAuthExchange(ctx context.Context, state, code string) (string, error) {
	plain, err := cryptoutil.DecryptAESGCM(s.cipherKey, state)
	if err != nil {
		return "", apperror.BadRequest(errors.New("invalid state"))
	}

	var st oauthState
	if err := json.Unmarshal(plain, &st); err != nil || time.Now().Unix() > st.Expires {
		return "", apperror.BadRequest(errors.New("the authorization expired; start again"))
	}

	c, err := s.repo.FindByOwner(ctx, st.ID, st.Owner)
	if err != nil || !IsOAuthType(c.Type) {
		return "", apperror.NotFound(errNotFound)
	}

	conf, err := s.oauthConfigFor(c, st.Redirect)
	if err != nil {
		return "", apperror.BadRequest(err)
	}

	tok, err := conf.Exchange(ctx, code, oauth2.VerifierOption(st.Verifier))
	if err != nil || tok.RefreshToken == "" {
		return "", apperror.BadRequest(errors.New("the provider did not return a refresh token; try again"))
	}

	secrets, _ := s.secretsOf(c)
	secrets["refreshToken"] = tok.RefreshToken

	raw, _ := json.Marshal(secrets)

	enc, err := cryptoutil.EncryptAESGCM(s.cipherKey, raw)
	if err != nil {
		return "", apperror.InternalServerError(err)
	}

	return c.Type, s.repo.UpdateFields(ctx, c.ID, map[string]any{"secrets_enc": enc})
}
