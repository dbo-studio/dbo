package cache

import (
	"time"
)

type Cache interface {
	ConditionalGet(key string, result any, condition bool) error
	Get(key string, result any) error
	Set(key string, value any, ttl *time.Duration) error
	Delete(key string) error
}
