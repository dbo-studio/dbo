package repository

import (
	"context"
	"errors"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type IConnectionSharedSecretRepoImpl struct {
	db *gorm.DB
}

func NewConnectionSharedSecretRepo(db *gorm.DB) IConnectionSharedSecretRepo {
	return &IConnectionSharedSecretRepoImpl{db: db}
}

func (r IConnectionSharedSecretRepoImpl) Find(ctx context.Context, connectionID uint) (*model.ConnectionSharedSecret, error) {
	var item model.ConnectionSharedSecret

	err := r.db.WithContext(ctx).Where("connection_id = ?", connectionID).First(&item).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.ErrConnectionSharedSecretNotFound
		}

		return nil, err
	}

	return &item, nil
}

func (r IConnectionSharedSecretRepoImpl) Upsert(ctx context.Context, secret *model.ConnectionSharedSecret) error {
	if secret.UpdatedAt.IsZero() {
		secret.UpdatedAt = time.Now().UTC()
	}

	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "connection_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"ciphertext", "updated_at"}),
	}).Create(secret).Error
}

func (r IConnectionSharedSecretRepoImpl) Delete(ctx context.Context, connectionID uint) error {
	return r.db.WithContext(ctx).
		Where("connection_id = ?", connectionID).
		Delete(&model.ConnectionSharedSecret{}).Error
}

func (r IConnectionSharedSecretRepoImpl) ListConnectionIDs(ctx context.Context, ids []uint) ([]uint, error) {
	if len(ids) == 0 {
		return nil, nil
	}

	var found []uint

	err := r.db.WithContext(ctx).
		Model(&model.ConnectionSharedSecret{}).
		Where("connection_id IN ?", ids).
		Pluck("connection_id", &found).Error

	return found, err
}
