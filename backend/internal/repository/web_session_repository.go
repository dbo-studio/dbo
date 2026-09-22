package repository

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"sync"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	defaultSessionTouchInterval = 60 * time.Second
	// AbsoluteSessionTTL is the max lifetime of a web session from creation.
	AbsoluteSessionTTL = 7 * 24 * time.Hour
)

type CreateSessionParams struct {
	UserID            *string
	AbsoluteExpiresAt time.Time
}

type webSessionRepoImpl struct {
	db *gorm.DB

	touchMu       sync.Mutex
	lastTouchByID map[string]time.Time
}

func NewWebSessionRepo(db *gorm.DB) IWebSessionRepo {
	return &webSessionRepoImpl{
		db:            db,
		lastTouchByID: make(map[string]time.Time),
	}
}

func (r *webSessionRepoImpl) Create(ctx context.Context) (string, error) {
	return r.CreateWithParams(ctx, CreateSessionParams{
		AbsoluteExpiresAt: time.Now().UTC().Add(AbsoluteSessionTTL),
	})
}

func (r *webSessionRepoImpl) CreateWithParams(ctx context.Context, params CreateSessionParams) (string, error) {
	sessionID, err := generateSessionID()
	if err != nil {
		return "", err
	}

	now := time.Now().UTC()
	abs := params.AbsoluteExpiresAt

	if abs.IsZero() {
		abs = now.Add(AbsoluteSessionTTL)
	}

	err = r.db.WithContext(ctx).Create(model.WebSession{
		ID:                sessionID,
		UserID:            params.UserID,
		CreatedAt:         now,
		LastSeenAt:        now,
		AbsoluteExpiresAt: &abs,
	}).Error
	if err != nil {
		return "", err
	}

	r.recordTouch(sessionID, now)

	return sessionID, nil
}

func (r *webSessionRepoImpl) Get(ctx context.Context, sessionID string) (*model.WebSession, error) {
	var session model.WebSession

	err := r.db.WithContext(ctx).Where("id = ?", sessionID).First(&session).Error
	if err != nil {
		return nil, err
	}

	return &session, nil
}

func (r *webSessionRepoImpl) Delete(ctx context.Context, sessionID string) error {
	err := r.db.WithContext(ctx).Where("id = ?", sessionID).Delete(&model.WebSession{}).Error
	if err != nil {
		return err
	}

	r.touchMu.Lock()
	delete(r.lastTouchByID, sessionID)
	r.touchMu.Unlock()

	return nil
}

func (r *webSessionRepoImpl) DeleteByUserID(ctx context.Context, userID string) error {
	if userID == "" {
		return nil
	}

	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Delete(&model.WebSession{}).Error
	if err != nil {
		return err
	}

	// Touch cache keys are session IDs; wipe all to avoid stale debounce after bulk delete.
	r.touchMu.Lock()
	r.lastTouchByID = make(map[string]time.Time)
	r.touchMu.Unlock()

	return nil
}

func (r *webSessionRepoImpl) EnsureSession(ctx context.Context, sessionID string) error {
	now := time.Now().UTC()
	abs := now.Add(AbsoluteSessionTTL)

	err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoNothing: true,
	}).Create(model.WebSession{
		ID:                sessionID,
		CreatedAt:         now,
		LastSeenAt:        now,
		AbsoluteExpiresAt: &abs,
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

	return r.TouchLastSeen(ctx, sessionID, time.Now().UTC())
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

func generateSessionID() (string, error) {
	var b [32]byte

	_, err := rand.Read(b[:])
	if err != nil {
		return "", err
	}

	return base64.RawURLEncoding.EncodeToString(b[:]), nil
}

// GenerateID returns a random URL-safe id (users, etc.).
func GenerateID() (string, error) {
	return generateSessionID()
}
