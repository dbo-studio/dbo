package cmd

import (
	"errors"
	"fmt"
	"log"

	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/internal/server"
	"github.com/khodemobin/dbo/pkg/helper"
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
	restServer := server.New(helper.IsLocal())

	if err := restServer.Start(helper.IsLocal(), app.Config().App.Port); err != nil {
		msg := fmt.Sprintf("error happen while serving: %v", err)
		app.Log().Error(errors.New(msg))
		log.Println(msg)
	}
}
