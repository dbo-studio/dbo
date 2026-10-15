package serviceAuth

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
	"golang.org/x/crypto/bcrypt"
)

const (
	SessionIdleTTL     = 24 * time.Hour
	SessionAbsoluteTTL = repository.AbsoluteSessionTTL
	SessionCookieName  = "dbo_session"
	LegacyCookieName   = "dbo_sid"
)

// dummyPasswordHash is used so login timing is similar when the user is missing.
var dummyPasswordHash []byte

func init() {
	hash, err := bcrypt.GenerateFromPassword([]byte("timing-dummy-password"), bcrypt.DefaultCost)
	if err != nil {
		panic(err)
	}

	dummyPasswordHash = hash
}

type IAuthService interface {
	Bootstrap(ctx context.Context) error
	Setup(ctx context.Context, req *dto.AuthSetupRequest) (sessionID string, err error)
	Status(ctx context.Context) (*dto.AuthStatusResponse, error)
	Login(ctx context.Context, req *dto.AuthLoginRequest) (*LoginResult, error)
	LoginTotp(ctx context.Context, req *dto.AuthLoginTotpRequest) (sessionID string, err error)
	ChangePassword(ctx context.Context, req *dto.AuthChangePasswordRequest) (sessionID string, err error)
	Logout(ctx context.Context, sessionID string) error
	Directory(ctx context.Context) ([]dto.UserDirectoryItem, error)
	TotpStatus(ctx context.Context) (*dto.AuthTotpStatusResponse, error)
	TotpSetup(ctx context.Context) (*dto.AuthTotpSetupResponse, error)
	TotpEnable(ctx context.Context, req *dto.AuthTotpEnableRequest) error
	TotpDisable(ctx context.Context, req *dto.AuthTotpDisableRequest) error
	LoadSessionUser(ctx context.Context, session *model.WebSession) (*model.User, error)
	SessionExpired(session *model.WebSession, now time.Time) bool
}

var _ IAuthService = (*IAuthServiceImpl)(nil)

type IAuthServiceImpl struct {
	users          repository.IUserRepo
	sessions       repository.IWebSessionRepo
	totpChallenges repository.ITotpLoginChallengeRepo
	cipherKey      []byte
	cfg            *config.Config
	logger         logger.Logger
	// setupMu makes the first-admin check and insert atomic.
	setupMu sync.Mutex
}

func NewAuthService(
	users repository.IUserRepo,
	sessions repository.IWebSessionRepo,
	totpChallenges repository.ITotpLoginChallengeRepo,
	cipherKey []byte,
	cfg *config.Config,
	appLogger logger.Logger,
) IAuthService {
	return &IAuthServiceImpl{
		users:          users,
		sessions:       sessions,
		totpChallenges: totpChallenges,
		cipherKey:      cipherKey,
		cfg:            cfg,
		logger:         appLogger,
	}
}

func (s *IAuthServiceImpl) Bootstrap(ctx context.Context) error {
	if s.cfg == nil {
		return nil
	}

	s.cfg.App.Auth.SharedOwnerID = ""

	if s.cfg.App.Client == config.ClientDesktop {
		s.cfg.App.Auth.Mode = config.AuthModeNone

		return nil
	}

	count, err := s.users.Count(ctx)
	if err != nil {
		return err
	}

	mode, legacy, err := config.ResolveAuthMode(count > 0, s.cfg)
	if err != nil {
		return err
	}

	email := strings.TrimSpace(s.cfg.App.Auth.AdminEmail)
	password := s.cfg.App.Auth.AdminPassword

	if mode == config.AuthModeLocal && count == 0 && email != "" && password != "" {
		if _, err := s.createFirstAdmin(ctx, email, password, true); err != nil {
			return err
		}

		s.logger.Info("bootstrapped local admin user from APP_ADMIN_EMAIL")
	}

	if mode == config.AuthModeNone && count > 0 {
		admin, err := s.users.FindFirstAdmin(ctx)
		switch {
		case err == nil:
			s.cfg.App.Auth.SharedOwnerID = admin.ID
			s.logger.Warn("login is off (APP_AUTH_MODE=none): every browser acts as " + admin.Email)
		case errors.Is(err, apperror.ErrUserNotFound):
			s.logger.Warn("login is off (APP_AUTH_MODE=none) and no active admin exists: each browser gets its own empty workspace")
		default:
			return err
		}
	}

	if legacy {
		s.logger.Warn("APP_AUTH_MODE is not set; login stays on because an admin exists. Set APP_AUTH_MODE=local to keep it, or none to turn it off")
	}

	s.cfg.App.Auth.Mode = mode
	s.logger.Info("auth mode: " + string(s.cfg.App.Auth.Mode))

	return nil
}

func (s *IAuthServiceImpl) Status(ctx context.Context) (*dto.AuthStatusResponse, error) {
	mode := config.AuthModeNone
	if s.cfg != nil {
		mode = s.cfg.App.Auth.Mode
		if s.cfg.App.Client == config.ClientDesktop {
			mode = config.AuthModeNone
		}
	}

	res := &dto.AuthStatusResponse{
		Mode:          string(mode),
		Authenticated: false,
	}

	if mode == config.AuthModeLocal && s.cfg.App.Client != config.ClientDesktop {
		count, err := s.users.Count(ctx)
		if err != nil {
			return nil, apperror.InternalServerError(err)
		}

		res.SetupRequired = count == 0
	}

	if s.cfg != nil && s.cfg.App.Client == config.ClientDesktop {
		res.Authenticated = true

		return res, nil
	}

	userID := helper.CtxUserID(ctx)
	if userID != "" {
		user, err := s.users.FindByID(ctx, userID)
		if err != nil {
			if errors.Is(err, apperror.ErrUserNotFound) {
				return res, nil
			}

			return nil, apperror.InternalServerError(err)
		}

		perms := permissionsDTO(user.PermissionFlags())
		res.Authenticated = true
		res.MustChangePassword = user.MustChangePassword
		res.TotpEnabled = user.TotpEnabled()
		res.Permissions = &perms
		res.User = &dto.AuthUserIdentity{
			ID:          user.ID,
			Email:       user.Email,
			Role:        string(user.Role),
			Permissions: &perms,
		}

		return res, nil
	}

	// Dev/loopback (none): treat as open; FE will not show login.
	if mode == config.AuthModeNone {
		res.Authenticated = true
	}

	return res, nil
}

func (s *IAuthServiceImpl) Login(ctx context.Context, req *dto.AuthLoginRequest) (*LoginResult, error) {
	if s.cfg == nil || s.cfg.App.Auth.Mode != config.AuthModeLocal {
		return nil, apperror.BadRequest(apperror.ErrAuthNotEnabled)
	}

	user, err := s.users.FindByEmail(ctx, strings.ToLower(strings.TrimSpace(req.Email)))
	hash := dummyPasswordHash

	if err != nil {
		if !errors.Is(err, apperror.ErrUserNotFound) {
			return nil, apperror.InternalServerError(err)
		}

		user = nil
	} else {
		hash = []byte(user.PasswordHash)
	}

	match := bcrypt.CompareHashAndPassword(hash, []byte(req.Password)) == nil
	if user == nil || user.IsDisabled() || !match {
		return nil, apperror.Unauthenticated()
	}

	if user.TotpEnabled() {
		token, err := s.createTotpChallenge(ctx, user.ID)
		if err != nil {
			return nil, apperror.InternalServerError(err)
		}

		return &LoginResult{TotpRequired: true, ChallengeToken: token}, nil
	}

	uid := user.ID

	sessionID, err := s.sessions.CreateWithParams(ctx, repository.CreateSessionParams{
		UserID:            &uid,
		AbsoluteExpiresAt: time.Now().UTC().Add(SessionAbsoluteTTL),
	})
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return &LoginResult{SessionID: sessionID}, nil
}

func (s *IAuthServiceImpl) ChangePassword(ctx context.Context, req *dto.AuthChangePasswordRequest) (string, error) {
	userID := helper.CtxUserID(ctx)
	if userID == "" {
		return "", apperror.Unauthenticated()
	}

	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, apperror.ErrUserNotFound) {
			return "", apperror.Unauthenticated()
		}

		return "", apperror.InternalServerError(err)
	}

	if user.MustChangePassword {
		if req.CurrentPassword != "" {
			if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
				return "", apperror.BadRequest(apperror.ErrInvalidCredentials)
			}
		}
	} else {
		if req.CurrentPassword == "" {
			return "", apperror.BadRequest(apperror.ErrInvalidCredentials)
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
			return "", apperror.BadRequest(apperror.ErrInvalidCredentials)
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return "", apperror.InternalServerError(err)
	}

	user.PasswordHash = string(hash)
	user.MustChangePassword = false

	if err := s.users.Update(ctx, user); err != nil {
		return "", apperror.InternalServerError(err)
	}

	if err := s.sessions.DeleteByUserID(ctx, user.ID); err != nil {
		return "", apperror.InternalServerError(err)
	}

	uid := user.ID

	sessionID, err := s.sessions.CreateWithParams(ctx, repository.CreateSessionParams{
		UserID:            &uid,
		AbsoluteExpiresAt: time.Now().UTC().Add(SessionAbsoluteTTL),
	})
	if err != nil {
		return "", apperror.InternalServerError(err)
	}

	return sessionID, nil
}

func (s *IAuthServiceImpl) Logout(ctx context.Context, sessionID string) error {
	if sessionID == "" {
		return nil
	}

	if err := s.sessions.Delete(ctx, sessionID); err != nil {
		return apperror.InternalServerError(err)
	}

	return nil
}

func (s *IAuthServiceImpl) Directory(ctx context.Context) ([]dto.UserDirectoryItem, error) {
	if err := helper.RequireInstanceAdmin(ctx); err != nil {
		return nil, err
	}

	if helper.CtxUserID(ctx) == "" {
		return []dto.UserDirectoryItem{}, nil
	}

	users, err := s.users.List(ctx)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	items := make([]dto.UserDirectoryItem, 0, len(users))
	for i := range users {
		if users[i].IsDisabled() {
			continue
		}

		items = append(items, dto.UserDirectoryItem{
			ID:    users[i].ID,
			Email: users[i].Email,
		})
	}

	return items, nil
}

func (s *IAuthServiceImpl) LoadSessionUser(ctx context.Context, session *model.WebSession) (*model.User, error) {
	if session == nil || session.UserID == nil || *session.UserID == "" {
		return nil, nil
	}

	user, err := s.users.FindByID(ctx, *session.UserID)
	if err != nil {
		return nil, err
	}

	if user.IsDisabled() {
		return nil, apperror.ErrUserDisabled
	}

	return user, nil
}

func (s *IAuthServiceImpl) SessionExpired(session *model.WebSession, now time.Time) bool {
	if session == nil {
		return true
	}

	if session.AbsoluteExpiresAt != nil && now.After(*session.AbsoluteExpiresAt) {
		return true
	}

	if now.Sub(session.LastSeenAt) > SessionIdleTTL {
		return true
	}

	return false
}

func permissionsDTO(flags model.UserPermissionFlags) dto.UserPermissions {
	return dto.UserPermissions{
		CreateConnection: flags.CreateConnection,
		AiSettings:       flags.AiSettings,
		McpSettings:      flags.McpSettings,
	}
}
