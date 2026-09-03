package config

import (
	"os"
	"strings"
)

type App struct {
	Name           string
	Port           string
	Env            Environment
	Client         Client
	PublicURL      string
	MCPURLOverride string
	DatabaseName   string
	Version        string
	ReleaseURLAPI  string
	ReleaseURL     string
	LogPath        string
	// AuthToken enables authenticated web mode: when set, API access requires a
	// session established by exchanging this token (POST /api/config/auth).
	AuthToken string
	// AllowedOrigins is a comma-separated list of extra origins allowed to make
	// credentialed cross-origin requests (localhost is always allowed).
	AllowedOrigins []string
}

type Config struct {
	App App
}

var config *Config

func New() *Config {
	config = &Config{
		App: App{
			Name:           "dbo",
			Port:           os.Getenv("APP_PORT"),
			Env:            Environment(os.Getenv("APP_ENV")),
			Client:         Client(os.Getenv("APP_CLIENT")),
			PublicURL:      os.Getenv("APP_PUBLIC_URL"),
			MCPURLOverride: os.Getenv("APP_MCP_PUBLIC_URL"),
			AuthToken:      os.Getenv("APP_AUTH_TOKEN"),
			AllowedOrigins: parseAllowedOrigins(os.Getenv("APP_ALLOWED_ORIGINS")),
			Version:        "v1.1.0",
			DatabaseName:   "dbo.db",
			ReleaseURLAPI:  "https://dbo-studio.com/api/config",
			ReleaseURL:     "https://dbo-studio.com/releases",
		},
	}

	return config
}

func parseAllowedOrigins(raw string) []string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}

	parts := strings.Split(trimmed, ",")

	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		if origin := strings.TrimSpace(part); origin != "" {
			origins = append(origins, origin)
		}
	}

	return origins
}
