package repository

import (
	"context"
	"errors"

	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type safeModePasswordRepoImpl struct {
	db *gorm.DB
}

func NewSafeModePasswordRepo() ISafeModePasswordRepo {
	return &safeModePasswordRepoImpl{
		db: container.Instance().DB(),
	}
}

func (r *safeModePasswordRepoImpl) FindByOwner(ctx context.Context, ownerID string) (*model.SafeModePassword, error) {
	var item model.SafeModePassword

	err := r.db.WithContext(ctx).Where("owner_id = ?", ownerID).First(&item).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.ErrSafeModePasswordNotFound
		}

		return nil, err
	}

	return &item, nil
}

func (r *safeModePasswordRepoImpl) Upsert(ctx context.Context, item *model.SafeModePassword) error {
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "owner_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"password_hash", "updated_at"}),
	}).Create(item).Error
}
