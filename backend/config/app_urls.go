package config

import (
	"fmt"
	"strings"
)

const defaultPort = "8080"

func (a App) ResolvedPort() string {
	if a.Port != "" {
		return a.Port
	}

	return defaultPort
}

func (a App) APIPublicURL() string {
	if base := strings.TrimSuffix(a.PublicURL, "/"); base != "" {
		return base + "/api"
	}

	return fmt.Sprintf("http://127.0.0.1:%s/api", a.ResolvedPort())
}

func (a App) MCPPublicURL() string {
	if override := strings.TrimSuffix(a.MCPURLOverride, "/"); override != "" {
		return override
	}

	return a.APIPublicURL() + "/mcp"
}
