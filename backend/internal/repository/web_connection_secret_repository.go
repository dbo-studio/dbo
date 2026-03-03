package repository

import (
	"context"
	"errors"
	"time"

	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type webConnectionSecretRepoImpl struct {
	db *gorm.DB
}

func NewWebConnectionSecretRepo() IWebConnectionSecretRepo {
	return &webConnectionSecretRepoImpl{
		db: container.Instance().DB(),
	}
}

func (r *webConnectionSecretRepoImpl) Upsert(ctx context.Context, secret *model.WebConnectionSecret) error {
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "session_id"}, {Name: "connection_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"ciphertext", "remember", "expires_at", "updated_at"}),
	}).Create(secret).Error
}

func (r *webConnectionSecretRepoImpl) FindBySessionAndConnection(ctx context.Context, sessionID string, connectionID uint) (*model.WebConnectionSecret, error) {
	var item model.WebConnectionSecret
	err := r.db.WithContext(ctx).
		Where("session_id = ? AND connection_id = ?", sessionID, connectionID).
		First(&item).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.ErrWebConnectionSecretNotFound
		}
		return nil, err
	}
	return &item, nil
}

func (r *webConnectionSecretRepoImpl) Delete(ctx context.Context, sessionID string, connectionID uint) error {
	return r.db.WithContext(ctx).
		Where("session_id = ? AND connection_id = ?", sessionID, connectionID).
		Delete(&model.WebConnectionSecret{}).Error
}

func (r *webConnectionSecretRepoImpl) UpdateExpiry(ctx context.Context, sessionID string, connectionID uint, expiresAt *time.Time, updatedAt time.Time) error {
	return r.db.WithContext(ctx).
		Model(&model.WebConnectionSecret{}).
		Where("session_id = ? AND connection_id = ?", sessionID, connectionID).
		Updates(map[string]any{"expires_at": expiresAt, "updated_at": updatedAt}).Error
}
