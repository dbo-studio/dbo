package server

import (
	"github.com/dbo-studio/dbo/internal/app/handler"
	queryHandler "github.com/dbo-studio/dbo/internal/app/handler/query"
	savedHandler "github.com/dbo-studio/dbo/internal/app/handler/saved_query"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/goccy/go-json"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/cors"
	fiberLogger "github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
)

type Handlers struct {
	Query      *queryHandler.QueryHandler
	Connection *handler.ConnectionHandler
	Database   *handler.DatabaseHandler
	SavedQuery *savedHandler.SavedQueryHandler
	Design     *handler.DesignHandler
	History    *handler.HistoryHandler
}

type Server struct {
	app      *fiber.App
	handlers Handlers
}

func New(logger logger.Logger, handlers Handlers) *Server {
	return &Server{
		app: fiber.New(fiber.Config{
			JSONEncoder: json.Marshal,
			JSONDecoder: json.Unmarshal,
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
