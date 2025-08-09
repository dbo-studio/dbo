package memory

import (
	"sync"
	"time"
)

type entry struct {
	value      any
	expiration time.Time
}

type Cache struct {
	mu   sync.Mutex
	data map[string]entry
}

func New() *Cache { return &Cache{data: make(map[string]entry)} }

func (c *Cache) Set(key string, value any, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data[key] = entry{value: value, expiration: time.Now().Add(ttl)}
}

func (c *Cache) Get(key string) (any, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.data[key]
	if !ok {
		return nil, false
	}
	if time.Now().After(e.expiration) {
		delete(c.data, key)
		return nil, false
	}
	return e.value, true
}
