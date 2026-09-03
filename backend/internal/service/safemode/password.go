package safemode

import (
	"context"
	"crypto/sha256"
	"errors"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	secretStore "github.com/dbo-studio/dbo/internal/service/secret_store"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cryptoutil"
	"github.com/dbo-studio/dbo/pkg/helper"
	"golang.org/x/crypto/bcrypt"
)

type ISafeModePasswordService interface {
	Status(ctx context.Context) (*dto.SafeModePasswordStatusResponse, error)
	Set(ctx context.Context, req *dto.SafeModePasswordSetRequest) error
	Change(ctx context.Context, req *dto.SafeModePasswordChangeRequest) error
	Verify(ctx context.Context, req *dto.SafeModePasswordVerifyRequest) (*dto.SafeModeUnlockResponse, error)
	Check(ctx context.Context, password string) error
	Configured(ctx context.Context) (bool, error)
}

var _ ISafeModePasswordService = (*ISafeModePasswordServiceImpl)(nil)

type ISafeModePasswordServiceImpl struct {
	repo        repository.ISafeModePasswordRepo
	unlockStore *UnlockStore
	aesKey      []byte
}

func NewPasswordService(repo repository.ISafeModePasswordRepo) ISafeModePasswordService {
	cfg := container.Instance().Config()

	secret, err := secretStore.LoadOrCreateAppSecretKey(cfg)
	if err != nil {
		container.Instance().Logger().Fatal(err)
	}

	sum := sha256.Sum256([]byte(secret))
	cache := container.Instance().Cache()

	return &ISafeModePasswordServiceImpl{
		repo:        repo,
		unlockStore: NewUnlockStore(cache),
		aesKey:      sum[:],
	}
}

func (s *ISafeModePasswordServiceImpl) Status(ctx context.Context) (*dto.SafeModePasswordStatusResponse, error) {
	configured, err := s.Configured(ctx)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return &dto.SafeModePasswordStatusResponse{Configured: configured}, nil
}

func (s *ISafeModePasswordServiceImpl) Configured(ctx context.Context) (bool, error) {
	_, err := s.repo.FindByOwner(ctx, helper.CtxOwnerID(ctx))
	if err != nil {
		if errors.Is(err, apperror.ErrSafeModePasswordNotFound) {
			return false, nil
		}

		return false, err
	}

	return true, nil
}

func (s *ISafeModePasswordServiceImpl) Set(ctx context.Context, req *dto.SafeModePasswordSetRequest) error {
	configured, err := s.Configured(ctx)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	if configured {
		return apperror.Conflict(apperror.ErrSafeModePasswordAlreadySet)
	}

	return s.save(ctx, req.Password)
}

func (s *ISafeModePasswordServiceImpl) Change(ctx context.Context, req *dto.SafeModePasswordChangeRequest) error {
	if err := s.Check(ctx, req.CurrentPassword); err != nil {
		return err
	}

	return s.save(ctx, req.Password)
}

func (s *ISafeModePasswordServiceImpl) save(ctx context.Context, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	ciphertext, err := cryptoutil.EncryptAESGCM(s.aesKey, hash)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	now := time.Now().UTC()
	item := &model.SafeModePassword{
		OwnerID:      helper.CtxOwnerID(ctx),
		PasswordHash: ciphertext,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.repo.Upsert(ctx, item); err != nil {
		return apperror.InternalServerError(err)
	}

	return nil
}

func (s *ISafeModePasswordServiceImpl) Check(ctx context.Context, password string) error {
	item, err := s.repo.FindByOwner(ctx, helper.CtxOwnerID(ctx))
	if err != nil {
		if errors.Is(err, apperror.ErrSafeModePasswordNotFound) {
			return apperror.BadRequest(apperror.ErrSafeModePasswordNotFound)
		}

		return apperror.InternalServerError(err)
	}

	hash, err := cryptoutil.DecryptAESGCM(s.aesKey, item.PasswordHash)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	if err := bcrypt.CompareHashAndPassword(hash, []byte(password)); err != nil {
		return apperror.SafeModePasswordInvalid()
	}

	return nil
}

func (s *ISafeModePasswordServiceImpl) Verify(ctx context.Context, req *dto.SafeModePasswordVerifyRequest) (*dto.SafeModeUnlockResponse, error) {
	if err := s.Check(ctx, req.Password); err != nil {
		return nil, err
	}

	if req.ConnectionID == nil {
		return &dto.SafeModeUnlockResponse{}, nil
	}

	until, err := s.unlockStore.UnlockGate(ctx, helper.CtxOwnerID(ctx), uint(*req.ConnectionID))
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return &dto.SafeModeUnlockResponse{
		UnlockedUntil: until.UTC().Format(time.RFC3339),
	}, nil
}
