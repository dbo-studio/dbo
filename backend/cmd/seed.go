package cmd

import (
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/model"
	"github.com/spf13/cobra"
)

func SeedCommand() *cobra.Command {
	cmdSeed := &cobra.Command{
		Use:   "seed",
		Short: "Insert fake data to db",
		Run: func(cmd *cobra.Command, args []string) {
			connections, err := model.Connection{}.SeedConnection(10)
			if err != nil {
				app.Log().Fatal(err)
			}
			app.DB().Create(connections)
		},
	}

	return cmdSeed
}
