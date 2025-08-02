package cmd

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/handler"
	"github.com/dbo-studio/dbo/internal/app/server"
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
	ctx := context.Background()

	cfg := config.New()
	appLogger := zap.New(cfg)
	appDB := db.New(cfg, appLogger).DB
	err := appDB.AutoMigrate(&model.CacheItem{}, &model.Connection{}, &model.SavedQuery{}, &model.History{})
	if err != nil {
		appLogger.Fatal(err)
	}

	cache := sqlite.NewSQLiteCache(appDB)
	rr := repository.NewRepository(ctx, appDB, cache)

	cm := databaseConnection.NewConnectionManager(appDB, appLogger, rr.HistoryRepo)

	ss := service.NewService(rr, cm, cache)

	restServer := server.New(appLogger, server.Handlers{
		Connection:   handler.NewConnectionHandler(appLogger, ss.ConnectionService),
		SavedQuery:   handler.NewSavedQueryHandler(appLogger, ss.SavedQueryService),
		History:      handler.NewHistoryHandler(appLogger, ss.HistoryService),
		TreeHandler:  handler.NewTreeHandler(appLogger, ss.TreeService),
		QueryHandler: handler.NewQueryHandler(appLogger, ss.QueryService),
	})

	if err := restServer.Start(helper.IsLocal(), cfg.App.Port); err != nil {
		msg := fmt.Sprintf("error happen while serving: %v", err)
		appLogger.Error(errors.New(msg))
		log.Println(msg)
	}
}
