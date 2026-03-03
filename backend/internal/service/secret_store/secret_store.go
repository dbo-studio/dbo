package secretStore

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/pkg/logger"
)

var ErrSecretNotFound = errors.New("secret not found")

type ISecretStore interface {
	SetConnectionPassword(ctx context.Context, ownerID string, connectionID uint, password string, remember bool) error
	GetConnectionPassword(ctx context.Context, ownerID string, connectionID uint) (string, error)
	DeleteConnectionPassword(ctx context.Context, ownerID string, connectionID uint) error
	IsTemporaryConnectionPassword(ctx context.Context, ownerID string, connectionID uint) (bool, error)
}

func NewSecretStore(
	cfg *config.Config,
	webSessionRepo webSessionProvider,
	webConnectionSecretRepo webConnectionSecretProvider,
	appLogger logger.Logger,
) ISecretStore {
	secret, err := LoadOrCreateAppSecretKey(cfg)
	if err != nil {
		appLogger.Fatal(err)
	}

	if cfg.App.Client == config.ClientDesktop {
		return NewDesktopDBStore(webSessionRepo, webConnectionSecretRepo, secret)
	}

	return NewWebDBStore(webSessionRepo, webConnectionSecretRepo, secret, 30*time.Minute)
}

func LoadOrCreateAppSecretKey(cfg *config.Config) (string, error) {
	path, err := appSecretKeyPath(cfg)
	if err != nil {
		return "", err
	}

	if b, err := os.ReadFile(path); err == nil {
		s := strings.TrimSpace(string(b))
		if s != "" {
			return s, nil
		}
	}

	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return "", err
	}

	var key [32]byte
	if _, err := rand.Read(key[:]); err != nil {
		return "", err
	}

	secret := base64.RawURLEncoding.EncodeToString(key[:])
	if err := os.WriteFile(path, []byte(secret), 0600); err != nil {
		return "", err
	}

	return secret, nil
}

func appSecretKeyPath(cfg *config.Config) (string, error) {
	if cfg.App.Env == config.EnvironmentDocker {
		return "data/app_secret.key", nil
	}
	if cfg.App.Env == config.EnvironmentTesting {
		return "data/testing_app_secret.key", nil
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	appName := cfg.App.Name
	switch runtime.GOOS {
	case "windows":
		appData := os.Getenv("APPDATA")
		if appData == "" {
			return "data/app_secret.key", nil
		}
		return filepath.Join(appData, appName, "storage", "app_secret.key"), nil
	case "darwin":
		return filepath.Join(homeDir, "Library", "Application Support", appName, "storage", "app_secret.key"), nil
	case "linux":
		return filepath.Join(homeDir, "."+appName, "storage", "app_secret.key"), nil
	default:
		return "data/app_secret.key", nil
	}
}
