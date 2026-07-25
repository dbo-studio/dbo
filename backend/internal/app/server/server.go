package server

import (
	"github.com/dbo-studio/dbo/internal/app/handler"
	"github.com/dbo-studio/dbo/internal/app/server/middleware"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/cors"
	fiberLogger "github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
)

type Handlers struct {
	Config       *handler.ConfigHandler
	Connection   *handler.ConnectionHandler
	SavedQuery   *handler.SavedQueryHandler
	History      *handler.HistoryHandler
	TreeHandler  *handler.TreeHandler
	QueryHandler *handler.QueryHandler
	ImportExport *handler.ImportExportHandler
	Job          *handler.JobHandler
	AI           *handler.AiHandler
	AiProvider   *handler.AiProviderHandler
	AiChat       *handler.AiChatHandler
	Mcp          *handler.McpHandler
}

type Server struct {
	app            *fiber.App
	handlers       Handlers
	webSessionRepo repository.IWebSessionRepo
}

func New(
	logger logger.Logger,
	handlers Handlers,
	webSessionRepo repository.IWebSessionRepo,
) *Server {
	return &Server{
		app: fiber.New(fiber.Config{
			ErrorHandler: func(_ fiber.Ctx, err error) error {
				logger.Error(err)
				return apperror.InternalServerError(err)
			},
		}),
		handlers:       handlers,
		webSessionRepo: webSessionRepo,
	}
}

func (r *Server) Start(isLocal bool, port string) error {
	if isLocal {
		r.app.Use(fiberLogger.New())
	} else {
		r.app.Use(recover.New(), compress.New())
	}

	r.app.Use(cors.New(cors.Config{
		AllowOrigins:     []string{},
		AllowOriginsFunc: func(origin string) bool { return origin != "" },
		AllowCredentials: true,
	}))

	r.app.Use(middleware.SkipClearRequestMiddleware)
	r.app.Use(middleware.OwnerSessionMiddleware(r.webSessionRepo))

	r.routing()
	return r.app.Listen(":" + port)
}

func (r *Server) Shutdown() error {
	return r.app.Shutdown()
}
