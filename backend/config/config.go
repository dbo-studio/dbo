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
	// AdminEmail / AdminPassword bootstrap the first local admin when no users exist.
	AdminEmail    string
	AdminPassword string
	// AuthMode is resolved after DB bootstrap (none | local).
	AuthMode AuthMode
	// AllowedOrigins is a comma-separated list of extra origins allowed to make
	// credentialed cross-origin requests (localhost is always allowed when AuthMode is none).
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
			AdminEmail:     strings.TrimSpace(os.Getenv("APP_ADMIN_EMAIL")),
			AdminPassword:  os.Getenv("APP_ADMIN_PASSWORD"),
			AuthMode:       AuthModeNone,
			AllowedOrigins: parseAllowedOrigins(os.Getenv("APP_ALLOWED_ORIGINS")),
			Version:        "v1.1.2",
			DatabaseName:   "dbo.db",
			ReleaseURLAPI:  "https://dbo-studio.com/api/config",
			ReleaseURL:     "https://dbo-studio.com/releases",
		},
	}

	return config
}

// ResolveAuthMode picks web auth mode: local if users exist or admin env is set; else none.
func ResolveAuthMode(hasUsers bool, cfg *Config) AuthMode {
	if cfg == nil || cfg.App.Client == ClientDesktop {
		return AuthModeNone
	}

	adminEmail := strings.TrimSpace(cfg.App.AdminEmail)
	adminPassword := cfg.App.AdminPassword

	if hasUsers || (adminEmail != "" && adminPassword != "") {
		return AuthModeLocal
	}

	return AuthModeNone
}

// AuthRequiresSession reports whether unauthenticated API access is blocked.
func (a App) AuthRequiresSession() bool {
	return a.AuthMode == AuthModeLocal
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
