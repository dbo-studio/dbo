package secretStore

import (
	"context"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
)

type webSessionProvider interface {
	EnsureSession(ctx context.Context, sessionID string) error
	TouchLastSeen(ctx context.Context, sessionID string, at time.Time) error
	TouchLastSeenDebounced(ctx context.Context, sessionID string, interval time.Duration) error
}

type webConnectionSecretProvider interface {
	Upsert(ctx context.Context, secret *model.WebConnectionSecret) error
	FindBySessionAndConnection(ctx context.Context, sessionID string, connectionID uint) (*model.WebConnectionSecret, error)
	Delete(ctx context.Context, sessionID string, connectionID uint) error
	UpdateExpiry(ctx context.Context, sessionID string, connectionID uint, expiresAt *time.Time, updatedAt time.Time) error
}
