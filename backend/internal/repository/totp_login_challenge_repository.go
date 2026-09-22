package repository

import (
	"context"
	"errors"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"gorm.io/gorm"
)

type ITotpLoginChallengeRepo interface {
	Create(ctx context.Context, challenge *model.TotpLoginChallenge) error
	Find(ctx context.Context, id string) (*model.TotpLoginChallenge, error)
	IncrementAttempts(ctx context.Context, id string) (int, error)
	Delete(ctx context.Context, id string) error
	DeleteByUserID(ctx context.Context, userID string) error
	DeleteExpired(ctx context.Context, before time.Time) error
}

type totpLoginChallengeRepoImpl struct {
	db *gorm.DB
}

func NewTotpLoginChallengeRepo(db *gorm.DB) ITotpLoginChallengeRepo {
	return &totpLoginChallengeRepoImpl{db: db}
}

func (r *totpLoginChallengeRepoImpl) Create(ctx context.Context, challenge *model.TotpLoginChallenge) error {
	return r.db.WithContext(ctx).Create(challenge).Error
}

func (r *totpLoginChallengeRepoImpl) Find(ctx context.Context, id string) (*model.TotpLoginChallenge, error) {
	var item model.TotpLoginChallenge

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&item).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.ErrTotpChallengeNotFound
		}

		return nil, err
	}

	return &item, nil
}

func (r *totpLoginChallengeRepoImpl) IncrementAttempts(ctx context.Context, id string) (int, error) {
	result := r.db.WithContext(ctx).Model(&model.TotpLoginChallenge{}).
		Where("id = ?", id).
		UpdateColumn("attempts", gorm.Expr("attempts + 1"))
	if result.Error != nil {
		return 0, result.Error
	}

	if result.RowsAffected == 0 {
		return 0, apperror.ErrTotpChallengeNotFound
	}

	var item model.TotpLoginChallenge
	if err := r.db.WithContext(ctx).Select("attempts").Where("id = ?", id).First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, apperror.ErrTotpChallengeNotFound
		}

		return 0, err
	}

	return item.Attempts, nil
}

func (r *totpLoginChallengeRepoImpl) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.TotpLoginChallenge{}).Error
}

func (r *totpLoginChallengeRepoImpl) DeleteByUserID(ctx context.Context, userID string) error {
	return r.db.WithContext(ctx).Where("user_id = ?", userID).Delete(&model.TotpLoginChallenge{}).Error
}

func (r *totpLoginChallengeRepoImpl) DeleteExpired(ctx context.Context, before time.Time) error {
	return r.db.WithContext(ctx).Where("expires_at < ?", before).Delete(&model.TotpLoginChallenge{}).Error
}
