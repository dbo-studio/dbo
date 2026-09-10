package databaseCore

import (
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
)

// DriverDeps carries cache/logger into driver repositories from the composition root.
type DriverDeps struct {
	Cache  cache.Cache
	Logger logger.Logger
}
