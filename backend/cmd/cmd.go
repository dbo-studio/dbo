package cmd

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/handler"
	"github.com/dbo-studio/dbo/internal/app/server"
	"github.com/dbo-studio/dbo/internal/container"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/migrations"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/internal/service"
	secretStore "github.com/dbo-studio/dbo/internal/service/secret_store"
	"github.com/dbo-studio/dbo/pkg/cache/sqlite"
	"github.com/dbo-studio/dbo/pkg/db"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger/zap"
	"github.com/joho/godotenv"
	"github.com/spf13/cobra"
)

func ServeCommand() *cobra.Command {
	cmdServe := &cobra.Command{
		Use:   "serve",
		Short: "Serve application",
		Run: func(_ *cobra.Command, _ []string) {
			Execute()
		},
	}

	return cmdServe
}

func loadEnvFiles() {
	for _, path := range []string{".env", "../.env"} {
		if err := godotenv.Load(path); err == nil {
			return
		}
	}
}

func Execute() {
	loadEnvFiles()

	cfg := config.New()
	appContainer := container.Instance()
	appContainer.SetConfig(cfg)

	appLogger := zap.New(cfg)
	appContainer.SetLogger(appLogger)

	sqliteDB := db.New(cfg, appLogger)
	appDB := sqliteDB.DB
	appContainer.SetDB(appDB)

	rawDB, err := appDB.DB()
	if err != nil {
		appLogger.Fatal(err)
	}

	if err := migrations.Up(context.Background(), rawDB); err != nil {
		appLogger.Fatal(err)
	}

	cache := sqlite.NewSQLiteCache(appDB)
	appContainer.SetCache(cache)

	rr := repository.NewRepository()
	secretStore := secretStore.NewSecretStore(cfg, rr.WebSessionRepo, rr.WebConnectionSecretRepo, appLogger)
	cm := databaseConnection.NewConnectionManager(rr.HistoryRepo, secretStore, appLogger)
	ss := service.NewService(rr, cm, secretStore)

	err = ss.JobManager.CancelAllJobs()
	if err != nil {
		appLogger.Error(err)
	}

	restServer := server.New(appLogger, server.Handlers{Config: handler.NewConfigHandler(ss.ConfigService),
		Connection:   handler.NewConnectionHandler(ss.ConnectionService),
		SavedQuery:   handler.NewSavedQueryHandler(ss.SavedQueryService),
		History:      handler.NewHistoryHandler(ss.HistoryService),
		TreeHandler:  handler.NewTreeHandler(ss.TreeService),
		QueryHandler: handler.NewQueryHandler(ss.QueryService),
		ImportExport: handler.NewImportExportHandler(ss.ImportExportService),
		Job:          handler.NewJobHandler(ss.JobService),
		AI:           handler.NewAiHandler(ss.AiService),
		AiProvider:   handler.NewAiProviderHandler(ss.AiProviderService),
		AiChat:       handler.NewAiChatHandler(ss.AiChatService),
		Mcp:          handler.NewMcpHandler(ss.McpService),
		Schema:       handler.NewSchemaHandler(ss.SchemaService),
		SafeMode:     handler.NewSafeModeHandler(ss.SafeModePasswordService),
	}, rr.WebSessionRepo)

	gracefulCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// SIGINT/SIGTERM: stop the job system (abort processors, wait, mark jobs
	// canceled) while Listen drains in-flight HTTP requests gracefully.
	go func() {
		<-gracefulCtx.Done()

		appLogger.Info("shutting down: stopping jobs and draining requests")

		if err := ss.JobManager.Shutdown(); err != nil {
			appLogger.Error(err)
		}
	}()

	if err := restServer.Start(gracefulCtx, helper.IsLocal(), cfg.App.ResolvedPort()); err != nil {
		msg := fmt.Sprintf("error happen while serving: %v", err)
		appLogger.Error(errors.New(msg))
		log.Println(msg)
	}
}
