package server

import (
	"github.com/dbo-studio/dbo/internal/app/handler"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/cors"
	fiberLogger "github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
)

type Handlers struct {
	Connection   *handler.ConnectionHandler
	SavedQuery   *handler.SavedQueryHandler
	History      *handler.HistoryHandler
	TreeHandler  *handler.TreeHandler
	QueryHandler *handler.QueryHandler
}

type Server struct {
	app      *fiber.App
	handlers Handlers
}

func New(logger logger.Logger, handlers Handlers) *Server {
	return &Server{
		app: fiber.New(fiber.Config{
			ErrorHandler: func(ctx fiber.Ctx, err error) error {
				logger.Error(err)
				return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"message": "Internal Server Error",
				})
			},
		}),
		handlers: handlers,
	}
}

func (r *Server) Start(isLocal bool, port string) error {
	if isLocal {
		r.app.Use(fiberLogger.New())
	} else {
		r.app.Use(recover.New(), compress.New())
	}

	r.app.Use(cors.New())
	r.app.Use(skipClearRequestMiddleware)

	r.routing()
	return r.app.Listen(":" + port)
}

func (r *Server) Shutdown() error {
	return r.app.Shutdown()
}
