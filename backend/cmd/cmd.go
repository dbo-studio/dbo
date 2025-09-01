package cmd

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/handler"
	"github.com/dbo-studio/dbo/internal/app/server"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/pkg/cache/sqlite"
	"github.com/dbo-studio/dbo/pkg/db"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger/zap"

	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/internal/service"
	"github.com/spf13/cobra"
)

func ServeCommand() *cobra.Command {
	cmdServe := &cobra.Command{
		Use:   "serve",
		Short: "Serve application",
		Run: func(cmd *cobra.Command, args []string) {
			Execute()
		},
	}
	return cmdServe
}

func Execute() {
	ctx := context.Background()

	cfg := config.New()
	appLogger := zap.New(cfg)
	appDB := db.New(cfg, appLogger).DB
	err := database.AutoMigrate(appDB)
	if err != nil {
		appLogger.Fatal(err)
	}

	cache := sqlite.NewSQLiteCache(appDB)
	rr := repository.NewRepository(ctx, appDB, cache)

	cm := databaseConnection.NewConnectionManager(appLogger, rr.HistoryRepo)

	ss := service.NewService(appLogger, rr, cm, cache)

	restServer := server.New(appLogger, server.Handlers{
		Config:       handler.NewConfigHandler(cfg, ss.AiProviderService),
		Connection:   handler.NewConnectionHandler(appLogger, ss.ConnectionService),
		SavedQuery:   handler.NewSavedQueryHandler(appLogger, ss.SavedQueryService),
		History:      handler.NewHistoryHandler(appLogger, ss.HistoryService),
		TreeHandler:  handler.NewTreeHandler(appLogger, ss.TreeService),
		QueryHandler: handler.NewQueryHandler(appLogger, ss.QueryService),
		ImportExport: handler.NewImportExportHandler(appLogger, ss.ImportExportService),
		Job:          handler.NewJobHandler(appLogger, ss.JobService),
		AI:           handler.NewAiHandler(appLogger, ss.AiService),
		AiProvider:   handler.NewAiProviderHandler(appLogger, ss.AiProviderService),
		AiChat:       handler.NewAiChatHandler(appLogger, ss.AiChatService),
	})

	if err := restServer.Start(helper.IsLocal(), cfg.App.Port); err != nil {
		msg := fmt.Sprintf("error happen while serving: %v", err)
		appLogger.Error(errors.New(msg))
		log.Println(msg)
	}
}
