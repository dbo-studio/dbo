package serviceAuth

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/passwordpolicy"
	"golang.org/x/crypto/bcrypt"
)

// Setup creates the first admin from the browser when login is on and no user
// exists yet, then signs that browser in. It needs the setup token printed at
// startup, so only someone with server access can claim the instance, and it
// refuses once any user exists.
func (s *IAuthServiceImpl) Setup(ctx context.Context, req *dto.AuthSetupRequest) (string, error) {
	if s.cfg == nil || s.cfg.App.Auth.Mode != config.AuthModeLocal {
		return "", apperror.BadRequest(apperror.ErrAuthNotEnabled)
	}

	s.setupMu.Lock()
	defer s.setupMu.Unlock()

	count, err := s.users.Count(ctx)
	if err != nil {
		return "", apperror.InternalServerError(err)
	}

	if count > 0 || s.setupToken == "" {
		return "", apperror.Forbidden(apperror.ErrAuthSetupDone)
	}

	if subtle.ConstantTimeCompare([]byte(strings.TrimSpace(req.Token)), []byte(s.setupToken)) != 1 {
		return "", apperror.Forbidden(apperror.ErrAuthSetupTokenInvalid)
	}

	user, err := s.createFirstAdmin(ctx, req.Email, req.Password, false)
	if err != nil {
		return "", err
	}

	s.setupToken = ""
	s.logger.Info("created first admin from the setup screen")

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

// createFirstAdmin inserts an admin and gives it all data created while login
// was off.
func (s *IAuthServiceImpl) createFirstAdmin(ctx context.Context, email, password string, mustChangePassword bool) (*model.User, error) {
	if err := passwordpolicy.ValidateNew(password); err != nil {
		return nil, apperror.BadRequest(err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	id, err := repository.GenerateID()
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	now := time.Now().UTC()
	adminPerms := model.DefaultAdminPermissionFlags()
	user := &model.User{
		ID:                   id,
		Email:                strings.ToLower(strings.TrimSpace(email)),
		PasswordHash:         string(hash),
		Role:                 model.UserRoleAdmin,
		PermCreateConnection: adminPerms.CreateConnection,
		PermAiSettings:       adminPerms.AiSettings,
		PermMcpSettings:      adminPerms.McpSettings,
		MustChangePassword:   mustChangePassword,
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	if err := s.users.Create(ctx, user); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if err := s.users.ReassignOwners(ctx, user.ID); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return user, nil
}

// resetSetupToken issues a new setup token when the setup screen is needed and
// prints it where the operator sees it: the log file and stderr (docker logs).
func (s *IAuthServiceImpl) resetSetupToken(needed bool) error {
	s.setupMu.Lock()
	defer s.setupMu.Unlock()

	s.setupToken = ""
	if !needed {
		return nil
	}

	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return err
	}

	s.setupToken = hex.EncodeToString(raw)

	msg := fmt.Sprintf(
		"no admin account yet: open %s/?setup=%s to create one (setup token %s)",
		strings.TrimSuffix(strings.TrimSuffix(s.cfg.App.APIPublicURL(), "/api"), "/"), s.setupToken, s.setupToken,
	)
	s.logger.Warn(msg)
	_, _ = fmt.Fprintln(os.Stderr, msg)

	return nil
}
