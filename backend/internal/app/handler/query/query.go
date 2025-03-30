package query_handler

import (
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
	"gorm.io/gorm"
)

type QueryHandler struct {
	logger logger.Logger
	db     *gorm.DB
	cache  cache.Cache
}

func NewQueryHandler(logger logger.Logger, db *gorm.DB, cache cache.Cache) *QueryHandler {
	return &QueryHandler{
		logger: logger,
		db:     db,
		cache:  cache,
	}
}
