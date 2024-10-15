package pgsql

import (
	"github.com/dbo-studio/dbo/internal/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type pgsql struct {
	app         *fiber.App
	connections map[int32]*gorm.DB
	db          *gorm.DB
}

func NewPgsqlDriver(app *fiber.App, db *gorm.DB) contract.IDriver {
	return pgsql{
		app:         app,
		connections: map[int32]*gorm.DB{},
		db:          db,
	}
}

func (p pgsql) Register() {
	p.registerRoutes()
}

func (p pgsql) DBLogger(query string) {
	go func(query string) {
		p.db.Save(&model.History{
			Query: query,
		})
	}(query)
}
