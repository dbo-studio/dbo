package cmd

import (
	"errors"
	"fmt"
	"log"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/handler"
	"github.com/dbo-studio/dbo/internal/app/server"
	"github.com/dbo-studio/dbo/internal/container"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/model"
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
	cfg := config.New()
	appContainer := container.Instance()
	appContainer.SetConfig(cfg)

	appLogger := zap.New(cfg)
	appContainer.SetLogger(appLogger)

	appDB := db.New(cfg, appLogger).DB
	appContainer.SetDB(appDB)

	err := appDB.AutoMigrate(
		&model.CacheItem{},
		&model.Connection{},
		&model.History{},
		&model.SavedQuery{},
		&model.Job{},
		&model.AiProvider{},
		&model.AiChat{},
		&model.AiChatMessage{},
	)

	if err != nil {
		appLogger.Fatal(err)
	}

	cache := sqlite.NewSQLiteCache(appDB)
	appContainer.SetCache(cache)

	rr := repository.NewRepository()
	cm := databaseConnection.NewConnectionManager(rr.HistoryRepo)
	ss := service.NewService(rr, cm)

	err = ss.JobManager.CancelAllJobs()
	if err != nil {
		appLogger.Error(err)
	}

	restServer := server.New(appLogger, server.Handlers{
		Config:       handler.NewConfigHandler(ss.ConfigService),
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
	})

	if err := restServer.Start(helper.IsLocal(), cfg.App.Port); err != nil {
		msg := fmt.Sprintf("error happen while serving: %v", err)
		appLogger.Error(errors.New(msg))
		log.Println(msg)
	}
}
