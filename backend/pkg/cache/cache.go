package cache

import (
	"context"
	"time"
)

type Cache interface {
	ConditionalGet(ctx context.Context, key string, result any, condition bool) error
	Get(ctx context.Context, key string, result any) error
	Set(ctx context.Context, key string, value any, ttl *time.Duration) error
	Delete(ctx context.Context, key string) error
	DeleteByPrefix(ctx context.Context, prefix string) error
}
