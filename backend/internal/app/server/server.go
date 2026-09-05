package server

import (
	"context"
	"net/url"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/handler"
	"github.com/dbo-studio/dbo/internal/app/server/middleware"
	"github.com/dbo-studio/dbo/internal/repository"
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
	Schema       *handler.SchemaHandler
	SafeMode     *handler.SafeModeHandler
}

type Server struct {
	app            *fiber.App
	cfg            *config.Config
	handlers       Handlers
	webSessionRepo repository.IWebSessionRepo
}

func New(
	logger logger.Logger,
	cfg *config.Config,
	handlers Handlers,
	webSessionRepo repository.IWebSessionRepo,
) *Server {
	return &Server{
		app: fiber.New(fiber.Config{
			// Cap request lifetimes so a stalled client or DB host cannot hold
			// resources (including the ConnectionManager) indefinitely.
			ReadTimeout:  30 * time.Second,
			WriteTimeout: 60 * time.Second,
			IdleTimeout:  120 * time.Second,
			ErrorHandler: func(c fiber.Ctx, err error) error {
				logger.Error(err)

				// Always send a JSON body — returning the error object here
				// would produce an empty response.
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"code":    fiber.StatusInternalServerError,
					"message": "Internal server error",
				})
			},
		}),
		cfg:            cfg,
		handlers:       handlers,
		webSessionRepo: webSessionRepo,
	}
}

func (r *Server) Start(gracefulCtx context.Context, isLocal bool, port string) error {
	// Recover middleware must run in every environment: without it a panic in
	// a handler (or processor goroutine) kills the whole process on desktop.
	r.app.Use(recover.New())

	if isLocal {
		r.app.Use(fiberLogger.New())
	} else {
		r.app.Use(compress.New())
	}

	r.app.Use(cors.New(cors.Config{
		AllowOrigins: []string{},
		// Only localhost origins (frontend dev server) plus explicitly configured
		// APP_ALLOWED_ORIGINS may make credentialed cross-origin requests.
		// The embedded web UI is served same-origin and needs no CORS.
		AllowOriginsFunc: allowOriginFunc(r.cfg),
		AllowCredentials: true,
	}))

	r.app.Use(middleware.OwnerSessionMiddleware(r.cfg, r.webSessionRepo))

	r.routing()

	return r.app.Listen(":"+port, fiber.ListenConfig{
		// GracefulContext makes Listen drain in-flight requests when the
		// context is canceled (SIGINT/SIGTERM) instead of dying mid-request.
		GracefulContext: gracefulCtx,
		ShutdownTimeout: 15 * time.Second,
	})
}

func (r *Server) Shutdown() error {
	return r.app.Shutdown()
}

// allowOriginFunc permits only loopback origins (frontend dev server) and the
// origins explicitly whitelisted via APP_ALLOWED_ORIGINS. Everything else — in
// particular arbitrary remote sites — must not be able to send credentialed
// requests to the API.
func allowOriginFunc(cfg *config.Config) func(string) bool {
	allowed := make(map[string]struct{}, len(cfg.App.AllowedOrigins))
	for _, origin := range cfg.App.AllowedOrigins {
		allowed[strings.TrimRight(origin, "/")] = struct{}{}
	}

	return func(origin string) bool {
		if origin == "" {
			return false
		}

		if _, ok := allowed[strings.TrimRight(origin, "/")]; ok {
			return true
		}

		u, err := url.Parse(origin)
		if err != nil {
			return false
		}

		switch u.Hostname() {
		case "localhost", "127.0.0.1", "::1":
			return true
		default:
			return false
		}
	}
}
