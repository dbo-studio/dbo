package container

import (
	"sync"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
	"gorm.io/gorm"
)

type Container struct {
	mu     sync.RWMutex
	logger logger.Logger
	config *config.Config
	cache  cache.Cache
	db     *gorm.DB
}

var (
	instance *Container
	once     sync.Once
)

func Instance() *Container {
	once.Do(func() {
		instance = &Container{}
	})
	return instance
}

func (c *Container) SetLogger(l logger.Logger) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.logger = l
}

func (c *Container) Logger() logger.Logger {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.logger
}

func (c *Container) SetConfig(cfg *config.Config) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.config = cfg
}

func (c *Container) Config() *config.Config {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.config
}

func (c *Container) SetCache(cache cache.Cache) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cache = cache
}

func (c *Container) Cache() cache.Cache {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.cache
}

func (c *Container) SetDB(db *gorm.DB) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.db = db
}

func (c *Container) DB() *gorm.DB {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.db
}
