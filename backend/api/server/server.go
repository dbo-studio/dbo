package server

import (
	"github.com/goccy/go-json"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/cors"
	fiberLogger "github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"

	connection_handler "github.com/dbo-studio/dbo/api/handler/connection"
	database_handler "github.com/dbo-studio/dbo/api/handler/database"
	design_handler "github.com/dbo-studio/dbo/api/handler/design"
	history_handler "github.com/dbo-studio/dbo/api/handler/history"
	query_handler "github.com/dbo-studio/dbo/api/handler/query"
	saved_handler "github.com/dbo-studio/dbo/api/handler/saved_query"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/internal/service"
)

type Server struct {
	app               *fiber.App
	queryHandler      query_handler.QueryHandler
	connectionHandler connection_handler.ConnectionHandler
	databaseHandler   database_handler.DatabaseHandler
	savedQueryHandler saved_handler.SavedQueryHandler
	designHandler     design_handler.DesignHandler
	historyHandler    history_handler.HistoryHandler
}

func New(service *service.Service, isLocal bool) *Server {
	return &Server{
		app: fiber.New(fiber.Config{
			JSONEncoder: json.Marshal,
			JSONDecoder: json.Unmarshal,
			ErrorHandler: func(ctx fiber.Ctx, err error) error {
				app.Log().Error(err)
				return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"message": "Internal Server Error",
				})
			},
		}),
		queryHandler: query_handler.QueryHandler{},
		connectionHandler: connection_handler.ConnectionHandler{
			ConnectionService: service.ConnectionService,
		},
		databaseHandler:   database_handler.DatabaseHandler{},
		savedQueryHandler: saved_handler.SavedQueryHandler{},
		designHandler:     design_handler.DesignHandler{},
		historyHandler:    history_handler.HistoryHandler{},
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
