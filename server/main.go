package main

import (
	"log"

	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/cmd"
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
	rootCmd.AddCommand(cmd.ServeCommand())
	if err := rootCmd.Execute(); err != nil {
		log.Fatal(err)
	}
}
