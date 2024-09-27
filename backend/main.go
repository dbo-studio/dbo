package main

import (
	"log"

	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/cmd"
	"github.com/spf13/cobra"
)

func main() {
	app.New()
	rootCmd := &cobra.Command{
		Use:                "app",
		DisableAutoGenTag:  true,
		DisableSuggestions: true,
		Run: func(c *cobra.Command, args []string) {
			cmd.Execute()
		},
	}
	rootCmd.AddCommand(cmd.ServeCommand(), cmd.SeedCommand())
	if err := rootCmd.Execute(); err != nil {
		log.Fatal(err)
	}
}
