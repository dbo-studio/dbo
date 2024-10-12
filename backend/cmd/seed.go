package cmd

import (
	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/db"
	"github.com/dbo-studio/dbo/pkg/logger/zap"
	"github.com/spf13/cobra"
)

func SeedCommand() *cobra.Command {
	cfg := config.New()
	appLogger := zap.New(cfg)
	appDB := db.New(cfg, appLogger).DB

	cmdSeed := &cobra.Command{
		Use:   "seed",
		Short: "Insert fake data to db",
		Run: func(cmd *cobra.Command, args []string) {
			connections, err := model.Connection{}.SeedConnection(10)
			if err != nil {
				appLogger.Fatal(err)
			}
			appDB.Create(connections)
		},
	}

	return cmdSeed
}
