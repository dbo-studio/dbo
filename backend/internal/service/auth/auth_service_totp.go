package serviceAuth

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cryptoutil"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

const (
	totpChallengeTTL = 5 * time.Minute
	totpIssuer       = "DBO Studio"
)

type LoginResult struct {
	SessionID      string
	TotpRequired   bool
	ChallengeToken string
}

func (s *IAuthServiceImpl) TotpStatus(ctx context.Context) (*dto.AuthTotpStatusResponse, error) {
	user, err := s.currentUser(ctx)
	if err != nil {
		return nil, err
	}

	return &dto.AuthTotpStatusResponse{Enabled: user.TotpEnabled()}, nil
}

func (s *IAuthServiceImpl) TotpSetup(ctx context.Context) (*dto.AuthTotpSetupResponse, error) {
	user, err := s.currentUser(ctx)
	if err != nil {
		return nil, err
	}

	if user.TotpEnabled() {
		return nil, apperror.BadRequest(apperror.ErrTotpAlreadyEnabled)
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      totpIssuer,
		AccountName: user.Email,
		Period:      30,
		Digits:      otp.DigitsSix,
		Algorithm:   otp.AlgorithmSHA1,
	})
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	ciphertext, err := cryptoutil.EncryptAESGCM(s.cipherKey, []byte(key.Secret()))
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	user.TotpSecretCiphertext = &ciphertext
	user.TotpEnabledAt = nil

	if err := s.users.Update(ctx, user); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return &dto.AuthTotpSetupResponse{
		Secret:     key.Secret(),
		OtpauthURL: key.URL(),
	}, nil
}

func (s *IAuthServiceImpl) TotpEnable(ctx context.Context, req *dto.AuthTotpEnableRequest) error {
	user, err := s.currentUser(ctx)
	if err != nil {
		return err
	}

	if user.TotpEnabled() {
		return apperror.BadRequest(apperror.ErrTotpAlreadyEnabled)
	}

	secret, err := s.decryptTotpSecret(user)
	if err != nil || secret == "" {
		return apperror.BadRequest(apperror.ErrTotpNotEnabled)
	}

	if err := s.validateTotpCode(user, req.Code); err != nil {
		return err
	}

	now := time.Now().UTC()
	user.TotpEnabledAt = &now

	if err := s.users.Update(ctx, user); err != nil {
		return apperror.InternalServerError(err)
	}

	return nil
}

func (s *IAuthServiceImpl) TotpDisable(ctx context.Context, req *dto.AuthTotpDisableRequest) error {
	user, err := s.currentUser(ctx)
	if err != nil {
		return err
	}

	if !user.TotpEnabled() {
		return apperror.BadRequest(apperror.ErrTotpNotEnabled)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return apperror.BadRequest(apperror.ErrInvalidCredentials)
	}

	if err := s.validateTotpCode(user, req.Code); err != nil {
		return err
	}

	return s.clearTotp(ctx, user)
}

func (s *IAuthServiceImpl) LoginTotp(ctx context.Context, req *dto.AuthLoginTotpRequest) (string, error) {
	_ = s.totpChallenges.DeleteExpired(ctx, time.Now().UTC())

	challenge, err := s.totpChallenges.Find(ctx, req.ChallengeToken)
	if err != nil {
		if errors.Is(err, apperror.ErrTotpChallengeNotFound) {
			return "", apperror.BadRequest(apperror.ErrTotpChallengeNotFound)
		}

		return "", apperror.InternalServerError(err)
	}

	if time.Now().UTC().After(challenge.ExpiresAt) {
		_ = s.totpChallenges.Delete(ctx, challenge.ID)

		return "", apperror.BadRequest(apperror.ErrTotpChallengeNotFound)
	}

	user, err := s.users.FindByID(ctx, challenge.UserID)
	if err != nil {
		return "", apperror.InternalServerError(err)
	}

	if user.IsDisabled() || !user.TotpEnabled() {
		return "", apperror.Unauthenticated()
	}

	if err := s.validateTotpCode(user, req.Code); err != nil {
		return "", err
	}

	_ = s.totpChallenges.Delete(ctx, challenge.ID)

	uid := user.ID

	return s.sessions.CreateWithParams(ctx, repository.CreateSessionParams{
		UserID:            &uid,
		AbsoluteExpiresAt: time.Now().UTC().Add(SessionAbsoluteTTL),
	})
}

func (s *IAuthServiceImpl) createTotpChallenge(ctx context.Context, userID string) (string, error) {
	_ = s.totpChallenges.DeleteExpired(ctx, time.Now().UTC())

	id, err := repository.GenerateID()
	if err != nil {
		return "", err
	}

	now := time.Now().UTC()
	challenge := &model.TotpLoginChallenge{
		ID:        id,
		UserID:    userID,
		ExpiresAt: now.Add(totpChallengeTTL),
		CreatedAt: now,
	}

	if err := s.totpChallenges.Create(ctx, challenge); err != nil {
		return "", err
	}

	return id, nil
}

func (s *IAuthServiceImpl) currentUser(ctx context.Context) (*model.User, error) {
	userID := helper.CtxUserID(ctx)
	if userID == "" {
		return nil, apperror.Unauthenticated()
	}

	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, apperror.ErrUserNotFound) {
			return nil, apperror.Unauthenticated()
		}

		return nil, apperror.InternalServerError(err)
	}

	return user, nil
}

func (s *IAuthServiceImpl) decryptTotpSecret(user *model.User) (string, error) {
	if user == nil || user.TotpSecretCiphertext == nil || *user.TotpSecretCiphertext == "" {
		return "", nil
	}

	plain, err := cryptoutil.DecryptAESGCM(s.cipherKey, *user.TotpSecretCiphertext)
	if err != nil {
		return "", err
	}

	return string(plain), nil
}

func (s *IAuthServiceImpl) clearTotp(ctx context.Context, user *model.User) error {
	user.TotpSecretCiphertext = nil
	user.TotpEnabledAt = nil

	if err := s.users.Update(ctx, user); err != nil {
		return apperror.InternalServerError(err)
	}

	return nil
}

func normalizeTotpCode(code string) string {
	return strings.TrimSpace(code)
}

func totpCodeValid(code string) bool {
	code = normalizeTotpCode(code)
	return len(code) >= 6 && len(code) <= 8
}

func (s *IAuthServiceImpl) validateTotpCode(user *model.User, code string) error {
	if !totpCodeValid(code) {
		return apperror.BadRequest(apperror.ErrInvalidTotpCode)
	}

	secret, err := s.decryptTotpSecret(user)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	if !totp.Validate(normalizeTotpCode(code), secret) {
		return apperror.BadRequest(apperror.ErrInvalidTotpCode)
	}

	return nil
}
