package repository

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"sync"
	"time"

	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const defaultSessionTouchInterval = 60 * time.Second

type webSessionRepoImpl struct {
	db *gorm.DB

	touchMu       sync.Mutex
	lastTouchByID map[string]time.Time
}

func NewWebSessionRepo() IWebSessionRepo {
	return &webSessionRepoImpl{
		db:            container.Instance().DB(),
		lastTouchByID: make(map[string]time.Time),
	}
}

func (r *webSessionRepoImpl) Create(ctx context.Context) (string, error) {
	sessionID := generateSessionID()
	now := time.Now()

	err := r.db.WithContext(ctx).Create(model.WebSession{
		ID:         sessionID,
		CreatedAt:  now,
		LastSeenAt: now,
	}).Error
	if err != nil {
		return "", err
	}

	r.recordTouch(sessionID, now)
	return sessionID, nil
}

func (r *webSessionRepoImpl) CreateOrUpdate(ctx context.Context, sessionID string) (string, error) {
	if sessionID == "" {
		return r.Create(ctx)
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

	r.recordTouch(sessionID, now)
	return sessionID, nil
}

func (r *webSessionRepoImpl) EnsureSession(ctx context.Context, sessionID string) error {
	now := time.Now()

	err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoNothing: true,
	}).Create(model.WebSession{
		ID:         sessionID,
		CreatedAt:  now,
		LastSeenAt: now,
	}).Error
	if err != nil {
		return err
	}

	r.recordTouch(sessionID, now)
	return nil
}

func (r *webSessionRepoImpl) TouchLastSeen(ctx context.Context, sessionID string, at time.Time) error {
	err := r.db.WithContext(ctx).
		Model(&model.WebSession{}).
		Where("id = ?", sessionID).
		Update("last_seen_at", at).Error
	if err != nil {
		return err
	}

	r.recordTouch(sessionID, at)
	return nil
}

func (r *webSessionRepoImpl) TouchLastSeenDebounced(ctx context.Context, sessionID string, interval time.Duration) error {
	if interval <= 0 {
		interval = defaultSessionTouchInterval
	}

	if r.shouldSkipTouch(sessionID, interval) {
		return nil
	}

	return r.TouchLastSeen(ctx, sessionID, time.Now())
}

func (r *webSessionRepoImpl) shouldSkipTouch(sessionID string, interval time.Duration) bool {
	r.touchMu.Lock()
	defer r.touchMu.Unlock()

	lastTouch, ok := r.lastTouchByID[sessionID]
	return ok && time.Since(lastTouch) < interval
}

func (r *webSessionRepoImpl) recordTouch(sessionID string, at time.Time) {
	r.touchMu.Lock()
	defer r.touchMu.Unlock()

	r.lastTouchByID[sessionID] = at
}

func generateSessionID() string {
	var b [32]byte
	_, err := rand.Read(b[:])
	if err != nil {
		return base64.RawURLEncoding.EncodeToString([]byte("fallback_session_id"))
	}
	return base64.RawURLEncoding.EncodeToString(b[:])
}
