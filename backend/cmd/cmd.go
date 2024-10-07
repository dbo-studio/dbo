package cmd

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/dbo-studio/dbo/api/server"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/helper"
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
	rr := repository.NewRepository(ctx)
	ss := service.NewService(rr)

	restServer := server.New(ss)

	if err := restServer.Start(helper.IsLocal(), app.Config().App.Port); err != nil {
		msg := fmt.Sprintf("error happen while serving: %v", err)
		app.Log().Error(errors.New(msg))
		log.Println(msg)
	}
}
