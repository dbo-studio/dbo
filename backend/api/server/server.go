package server

import (
	"github.com/goccy/go-json"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	fiberLogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	connection_handler "github.com/khodemobin/dbo/api/handler/connection"
	database_handler "github.com/khodemobin/dbo/api/handler/database"
	design_handler "github.com/khodemobin/dbo/api/handler/design"
	query_handler "github.com/khodemobin/dbo/api/handler/query"
	saved_handler "github.com/khodemobin/dbo/api/handler/saved_query"
	"github.com/khodemobin/dbo/app"
)

type Server struct {
	app               *fiber.App
	queryHandler      query_handler.QueryHandler
	connectionHandler connection_handler.ConnectionHandler
	databaseHandler   database_handler.DatabaseHandler
	savedQueryHandler saved_handler.SavedQueryHandler
	designHandler     design_handler.DesignHandler
}

func New(isLocal bool) *Server {
	return &Server{
		app: fiber.New(fiber.Config{
			JSONEncoder: json.Marshal,
			JSONDecoder: json.Unmarshal,
			ErrorHandler: func(ctx *fiber.Ctx, err error) error {
				app.Log().Error(err)
				return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"message": "Internal Server Error",
				})
			},
		}),
		queryHandler:      query_handler.QueryHandler{},
		connectionHandler: connection_handler.ConnectionHandler{},
		databaseHandler:   database_handler.DatabaseHandler{},
		savedQueryHandler: saved_handler.SavedQueryHandler{},
		designHandler:     design_handler.DesignHandler{},
	}
}

func (r *Server) Start(isLocal bool, port string) error {
	if isLocal {
		r.app.Use(fiberLogger.New())
	} else {
		r.app.Use(recover.New(), compress.New())
	}

	r.app.Use(cors.New())

	r.routing()
	return r.app.Listen(":" + port)
}

func (r *Server) Shutdown() error {
	return r.app.Shutdown()
}
