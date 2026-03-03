package repository

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"time"

	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type webSessionRepoImpl struct {
	db *gorm.DB
}

func NewWebSessionRepo() IWebSessionRepo {
	return &webSessionRepoImpl{
		db: container.Instance().DB(),
	}
}

func (r *webSessionRepoImpl) CreateOrUpdate(ctx context.Context, sessionID string) (string, error) {
	if sessionID == "" {
		sessionID = generateSessionID()
	}

	now := time.Now()

	err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.Assignments(map[string]any{"last_seen_at": now}),
	}).Create(model.WebSession{
		ID:         sessionID,
		CreatedAt:  now,
		LastSeenAt: now,
	}).Error

	if err != nil {
		return "", err
	}

	return sessionID, nil
}

func (r *webSessionRepoImpl) TouchLastSeen(ctx context.Context, sessionID string, at time.Time) error {
	return r.db.WithContext(ctx).
		Model(&model.WebSession{}).
		Where("id = ?", sessionID).
		Update("last_seen_at", at).Error
}

func generateSessionID() string {
	var b [32]byte
	_, err := rand.Read(b[:])
	if err != nil {
		return base64.RawURLEncoding.EncodeToString([]byte("fallback_session_id"))
	}
	return base64.RawURLEncoding.EncodeToString(b[:])
}
