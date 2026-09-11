package serviceAuth

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/passwordpolicy"
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

	if s.cfg.App.Client == config.ClientDesktop {
		s.cfg.App.AuthMode = config.AuthModeNone

		return nil
	}

	count, err := s.users.Count(ctx)
	if err != nil {
		return err
	}

	email := strings.TrimSpace(s.cfg.App.AdminEmail)
	password := s.cfg.App.AdminPassword

	if count == 0 && email != "" && password != "" {
		if err := passwordpolicy.ValidateNew(password); err != nil {
			return apperror.BadRequest(err)
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		id, err := repository.GenerateID()
		if err != nil {
			return err
		}

		now := time.Now().UTC()
		adminPerms := model.DefaultAdminPermissions()
		user := &model.User{
			ID:                   id,
			Email:                strings.ToLower(email),
			PasswordHash:         string(hash),
			Role:                 model.UserRoleAdmin,
			PermCreateConnection: adminPerms.CreateConnection,
			PermAiSettings:       adminPerms.AiSettings,
			PermMcpSettings:      adminPerms.McpSettings,
			MustChangePassword:   true,
			CreatedAt:            now,
			UpdatedAt:            now,
		}

		if err := s.users.Create(ctx, user); err != nil {
			return err
		}

		if err := s.users.ReassignOwners(ctx, user.ID); err != nil {
			return err
		}

		s.logger.Info("bootstrapped local admin user from APP_ADMIN_EMAIL")

		count = 1
	}

	s.cfg.App.AuthMode = config.ResolveAuthMode(count > 0, s.cfg)
	s.logger.Info("auth mode: " + string(s.cfg.App.AuthMode))

	return nil
}

func (s *IAuthServiceImpl) Status(ctx context.Context) (*dto.AuthStatusResponse, error) {
	mode := config.AuthModeNone
	if s.cfg != nil {
		mode = s.cfg.App.AuthMode
		if s.cfg.App.Client == config.ClientDesktop {
			mode = config.AuthModeNone
		}
	}

	res := &dto.AuthStatusResponse{
		Mode:          string(mode),
		Authenticated: false,
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

		perms := user.EffectivePermissions()
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
	if s.cfg == nil || s.cfg.App.AuthMode != config.AuthModeLocal {
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

	if old := helper.CtxSessionID(ctx); old != "" {
		_ = s.sessions.Delete(ctx, old)
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
