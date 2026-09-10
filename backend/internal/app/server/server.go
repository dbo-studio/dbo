package server

import (
	"context"
	"errors"
	"net/url"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/handler"
	"github.com/dbo-studio/dbo/internal/app/server/middleware"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceAuth "github.com/dbo-studio/dbo/internal/service/auth"
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
	Auth         *handler.AuthHandler
	AdminUsers   *handler.AdminUsersHandler
}

type Server struct {
	app            *fiber.App
	cfg            *config.Config
	handlers       Handlers
	webSessionRepo repository.IWebSessionRepo
	authService    serviceAuth.IAuthService
}

func New(
	logger logger.Logger,
	cfg *config.Config,
	handlers Handlers,
	webSessionRepo repository.IWebSessionRepo,
	authService serviceAuth.IAuthService,
) *Server {
	return &Server{
		app: fiber.New(fiber.Config{
			ReadTimeout: 30 * time.Second,
			// WriteTimeout disabled: AI streams and large query responses can
			// exceed a fixed cap without indicating a stalled client.
			WriteTimeout: 0,
			IdleTimeout:  120 * time.Second,
			ErrorHandler: func(c fiber.Ctx, err error) error {
				logger.Error(err)

				var fiberErr *fiber.Error
				if errors.As(err, &fiberErr) {
					return c.Status(fiberErr.Code).JSON(fiber.Map{
						"code":    fiberErr.Code,
						"message": fiberErr.Message,
					})
				}

				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"code":    fiber.StatusInternalServerError,
					"message": "Internal server error",
				})
			},
		}),
		cfg:            cfg,
		handlers:       handlers,
		webSessionRepo: webSessionRepo,
		authService:    authService,
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
		AllowOrigins:     []string{},
		AllowOriginsFunc: allowOriginFunc(r.cfg),
		AllowCredentials: true,
	}))

	r.app.Use(middleware.OwnerSessionMiddleware(r.cfg, r.webSessionRepo, r.authService))

	r.routing()

	return r.app.Listen(":"+port, fiber.ListenConfig{
		GracefulContext: gracefulCtx,
		ShutdownTimeout: 15 * time.Second,
	})
}

func (r *Server) Shutdown() error {
	return r.app.Shutdown()
}

func allowOriginFunc(cfg *config.Config) func(string) bool {
	allowed := make(map[string]struct{}, len(cfg.App.AllowedOrigins))
	for _, origin := range cfg.App.AllowedOrigins {
		allowed[strings.TrimRight(origin, "/")] = struct{}{}
	}

	serverWeb := cfg != nil && cfg.App.AuthRequiresSession()

	return func(origin string) bool {
		if origin == "" {
			return false
		}

		if _, ok := allowed[strings.TrimRight(origin, "/")]; ok {
			return true
		}

		if serverWeb {
			return false
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
