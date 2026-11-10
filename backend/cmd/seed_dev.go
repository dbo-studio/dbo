package cmd

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/spf13/cobra"
)

// devConnection is one sample server of docker-compose.dev.yml. Ports come from the same *_TEST_* variables
// the compose file and the e2e suite read, so a changed port in .env is honoured here.
type devConnection struct {
	name    string
	typ     string
	options map[string]any
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}

	return fallback
}

func envPort(key string, fallback int) int {
	if n, err := strconv.Atoi(os.Getenv(key)); err == nil && n > 0 {
		return n
	}

	return fallback
}

func devConnections() []devConnection {
	host := func(key string) string { return envOr(key, "127.0.0.1") }

	return []devConnection{
		{"Dev PostgreSQL", "postgresql", map[string]any{"host": host("PGSQL_TEST_HOST"), "port": envPort("PGSQL_TEST_PORT", 45432), "username": "default", "password": "secret", "database": "default"}},
		{"Dev MySQL", "mysql", map[string]any{"host": host("MYSQL_TEST_HOST"), "port": envPort("MYSQL_TEST_PORT", 43306), "username": "root", "password": "secret", "database": "default"}},
		{"Dev SQL Server", "sqlserver", map[string]any{"host": host("MSSQL_TEST_HOST"), "port": envPort("MSSQL_TEST_PORT", 41433), "username": "sa", "password": "Secret_pass1", "database": "shop"}},
		{"Dev ClickHouse", "clickhouse", map[string]any{"host": host("CLICKHOUSE_TEST_HOST"), "port": envPort("CLICKHOUSE_TEST_PORT", 49000), "username": "default", "password": "secret", "database": "shop"}},
		{"Dev Redis", "redis", map[string]any{"host": host("REDIS_TEST_HOST"), "port": envPort("REDIS_TEST_PORT", 46379)}},
		{"Dev MongoDB", "mongodb", map[string]any{"host": host("MONGO_TEST_HOST"), "port": envPort("MONGO_TEST_PORT", 47017)}},
	}
}

// SeedDevCommand creates a connection for every main sample server of docker-compose.dev.yml in the app database.
func SeedDevCommand() *cobra.Command {
	var owner string

	cmd := &cobra.Command{
		Use:   "seed-dev",
		Short: "Create connections for the sample databases of docker-compose.dev.yml",
		Long: "Creates one connection per sample server (PostgreSQL, MySQL, SQL Server, ClickHouse, Redis, MongoDB) " +
			"in the app database that APP_DATABASE_PATH points to. Existing connections with the same name are kept. " +
			"A server that is not running is reported and skipped.",
		RunE: func(_ *cobra.Command, _ []string) error {
			return seedDev(context.Background(), bootstrap(), owner)
		},
	}

	cmd.Flags().StringVar(&owner, "owner", "", "owner id to create the connections for (default: the desktop owner, or every existing browser session / user in web mode)")

	return cmd
}

// seedOwners says who gets the connections. Connections belong to an owner: the desktop app is always "desktop",
// but in web mode each browser session (login off) or user (login on) is its own owner, so a connection made for
// "desktop" would never show up in a browser.
func seedOwners(a *app, explicit string) ([]string, error) {
	switch {
	case explicit != "":
		return []string{explicit}, nil
	case a.cfg.App.Client == config.ClientDesktop:
		return []string{"desktop"}, nil
	case a.cfg.App.Auth.SharedOwnerID != "":
		return []string{a.cfg.App.Auth.SharedOwnerID}, nil
	}

	query := "SELECT id FROM web_sessions WHERE id <> 'desktop' AND user_id IS NULL AND absolute_expires_at > datetime('now')"
	if a.cfg.App.Auth.Mode == config.AuthModeLocal {
		query = "SELECT id FROM users"
	}

	var owners []string
	if err := a.db.Raw(query).Scan(&owners).Error; err != nil {
		return nil, err
	}

	if len(owners) == 0 {
		return nil, errors.New("no browser session or user exists yet: open the app once, or pass --owner")
	}

	return owners, nil
}

func seedDev(ctx context.Context, a *app, explicitOwner string) error {
	fmt.Printf("app database: %s\n", envOr("APP_DATABASE_PATH", "(default location)"))

	owners, err := seedOwners(a, explicitOwner)
	if err != nil {
		return err
	}

	failed := 0

	for _, owner := range owners {
		fmt.Printf("owner: %s\n", owner)

		failed += seedOwner(helper.CtxWithOwnerID(ctx, owner), a)
	}

	if failed > 0 {
		return fmt.Errorf("%d connection(s) could not be created: start them with `docker compose -f docker-compose.dev.yml up -d`", failed)
	}

	return nil
}

func seedOwner(ctx context.Context, a *app) (failed int) {
	existing, err := a.ss.ConnectionService.Index(ctx)
	if err != nil {
		fmt.Printf("skip   cannot list connections: %v\n", err)

		return 1
	}

	have := map[string]bool{}
	for _, c := range existing.Connections {
		have[c.Name] = true
	}

	for _, c := range devConnections() {
		if have[c.name] {
			fmt.Printf("keep   %-16s already exists\n", c.name)

			continue
		}

		options, err := json.Marshal(c.options)
		if err != nil {
			fmt.Printf("skip   %-16s %v\n", c.name, err)

			failed++

			continue
		}

		// Create pings the server first, so a stopped container fails here with its reason.
		if err := a.ss.ConnectionService.Create(ctx, &dto.CreateConnectionRequest{Name: c.name, Type: c.typ, Options: options, Env: ptr("dev")}); err != nil {
			failed++

			fmt.Printf("skip   %-16s %v\n", c.name, err)

			continue
		}

		fmt.Printf("create %-16s %s\n", c.name, c.typ)
	}

	return failed
}

func ptr[T any](v T) *T { return &v }
