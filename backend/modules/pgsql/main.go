package pgsql

import (
	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/contract"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type pgsql struct {
	app    *fiber.App
	cfg    *config.Config
	logger logger.Logger
	db     *gorm.DB
	cache  cache.Cache
}

func NewPgsqlDriver(
	app *fiber.App,
	cfg *config.Config,
	logger logger.Logger,
	db *gorm.DB,
	cache cache.Cache,
) contract.IModule {
	return pgsql{
		app:    app,
		cfg:    cfg,
		logger: logger,
		db:     db,
		cache:  cache,
	}
}

func (p pgsql) Register() {
	p.registerRoutes()
}
