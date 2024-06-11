package cache

import (
	"time"
)

type Cache interface {
	Get(key string, result *any) error
	Set(key string, value any, ttl *time.Duration) error
	Delete(key string) error
}
