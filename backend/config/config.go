package config

import (
	"fmt"
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
	ReleaseURL     string
	WebsiteAPIURL  string
	LogPath        string
	Auth           Auth
	AllowedOrigins []string
}

type Auth struct {
	Configured    AuthMode
	Mode          AuthMode
	AdminEmail    string
	AdminPassword string
	SharedOwnerID string
}

type Config struct {
	App App
}

var config *Config

const (
	websiteHost    = "https://dbo-studio.com"
	devWebsiteHost = "https://dev.dbo-studio.com"
)

func New() *Config {
	env := Environment(os.Getenv("APP_ENV"))

	host := websiteHost
	if env == EnvironmentLocal {
		host = devWebsiteHost
	}

	config = &Config{
		App: App{
			Name:           "dbo",
			Port:           os.Getenv("APP_PORT"),
			Env:            env,
			Client:         Client(os.Getenv("APP_CLIENT")),
			PublicURL:      os.Getenv("APP_PUBLIC_URL"),
			MCPURLOverride: os.Getenv("APP_MCP_PUBLIC_URL"),
			Auth: Auth{
				Configured:    AuthMode(strings.ToLower(strings.TrimSpace(os.Getenv("APP_AUTH_MODE")))),
				Mode:          AuthModeNone,
				AdminEmail:    strings.TrimSpace(os.Getenv("APP_ADMIN_EMAIL")),
				AdminPassword: os.Getenv("APP_ADMIN_PASSWORD"),
			},
			AllowedOrigins: parseAllowedOrigins(os.Getenv("APP_ALLOWED_ORIGINS")),
			Version:        "v1.2.0",
			DatabaseName:   "dbo.db",
			ReleaseURL:     host + "/releases",
			WebsiteAPIURL:  host + "/api",
		},
	}

	if override := strings.TrimSpace(os.Getenv("APP_WEBSITE_API_URL")); override != "" {
		config.App.WebsiteAPIURL = strings.TrimRight(override, "/")
	}

	return config
}

// ResolveAuthMode picks web auth mode. APP_AUTH_MODE wins when set. Unset keeps
// the old behavior (local if users exist or admin env is set) so upgrades
// never drop login; legacy reports that fallback was used.
func ResolveAuthMode(hasUsers bool, cfg *Config) (mode AuthMode, legacy bool, err error) {
	if cfg == nil || cfg.App.Client == ClientDesktop {
		return AuthModeNone, false, nil
	}

	switch cfg.App.Auth.Configured {
	case AuthModeLocal:
		return AuthModeLocal, false, nil
	case AuthModeNone:
		return AuthModeNone, false, nil
	case "":
	default:
		return "", false, fmt.Errorf("invalid APP_AUTH_MODE %q: use none or local", cfg.App.Auth.Configured)
	}

	adminEmail := strings.TrimSpace(cfg.App.Auth.AdminEmail)
	adminPassword := cfg.App.Auth.AdminPassword

	if hasUsers || (adminEmail != "" && adminPassword != "") {
		return AuthModeLocal, true, nil
	}

	return AuthModeNone, false, nil
}

// AuthRequiresSession reports whether unauthenticated API access is blocked.
func (a App) AuthRequiresSession() bool {
	return a.Auth.Mode == AuthModeLocal
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
