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
	Delete(ctx context.Context, id string) error
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

func (r *totpLoginChallengeRepoImpl) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.TotpLoginChallenge{}).Error
}

func (r *totpLoginChallengeRepoImpl) DeleteExpired(ctx context.Context, before time.Time) error {
	return r.db.WithContext(ctx).Where("expires_at < ?", before).Delete(&model.TotpLoginChallenge{}).Error
}
