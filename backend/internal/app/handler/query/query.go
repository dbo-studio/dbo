package query_handler

import (
	"github.com/dbo-studio/dbo/internal/contract"
	"github.com/dbo-studio/dbo/internal/driver"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
	"gorm.io/gorm"
)

type QueryHandler struct {
	logger        logger.Logger
	db            *gorm.DB
	drivers       *driver.DriverEngine
	cache         cache.Cache
	designService contract.IDesignService
}

func NewQueryHandler(logger logger.Logger, db *gorm.DB, drivers *driver.DriverEngine, cache cache.Cache, designService contract.IDesignService) *QueryHandler {
	return &QueryHandler{
		logger:        logger,
		db:            db,
		drivers:       drivers,
		cache:         cache,
		designService: designService,
	}
}
