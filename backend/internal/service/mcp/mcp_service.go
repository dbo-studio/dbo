package serviceMCP

import (
	"github.com/dbo-studio/dbo/config"

	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceDbtools "github.com/dbo-studio/dbo/internal/service/dbtools"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
)

type IMcpService interface {
	Status(ctx context.Context) (*dto.McpStatusResponse, error)
	Update(ctx context.Context, req *dto.McpUpdateRequest) (*dto.McpUpdateResponse, error)
	RegenerateToken(ctx context.Context) (*dto.McpRegenerateTokenResponse, error)
	AuthenticateToken(ctx context.Context, token string) (*model.McpSettings, bool)
	ValidateToken(ctx context.Context, token string) bool
	HTTPHandler() http.Handler
	IsEnabled(ctx context.Context) bool
}

type McpServiceImpl struct {
	settingsRepo repository.IMcpSettingsRepo
	nativeServer *NativeServer
	logger       logger.Logger
	cfg          *config.Config
}

func NewMcpService(
	settingsRepo repository.IMcpSettingsRepo,
	_ repository.IConnectionRepo,
	toolRegistry *serviceDbtools.Registry,
	appLogger logger.Logger,
	cfg *config.Config,
) IMcpService {
	return &McpServiceImpl{
		settingsRepo: settingsRepo,
		nativeServer: NewNativeServer(toolRegistry),
		logger:       appLogger,
		cfg:          cfg,
	}
}

func (s *McpServiceImpl) Status(ctx context.Context) (*dto.McpStatusResponse, error) {
	settings, err := s.settingsRepo.FindByOwner(ctx, helper.CtxOwnerID(ctx))
	if err != nil {
		return nil, err
	}

	return s.buildStatus(settings), nil
}

func (s *McpServiceImpl) Update(ctx context.Context, req *dto.McpUpdateRequest) (*dto.McpUpdateResponse, error) {
	settings, err := s.settingsRepo.FindByOwner(ctx, helper.CtxOwnerID(ctx))
	if err != nil {
		return nil, err
	}

	if req.Enabled {
		token, hash, err := generateToken()
		if err != nil {
			return nil, err
		}

		settings.Enabled = true

		settings.TokenHash = &hash
		if req.DefaultConnectionID != nil {
			settings.DefaultConnectionID = req.DefaultConnectionID
		}

		s.nativeServer.SetDefaultConnectionID(settings.DefaultConnectionID)

		if _, err := s.settingsRepo.Upsert(ctx, settings); err != nil {
			return nil, err
		}

		status := s.buildStatus(settings)

		return &dto.McpUpdateResponse{Token: token, McpStatusResponse: *status}, nil
	}

	settings.Enabled = false
	settings.TokenHash = nil

	s.nativeServer.SetDefaultConnectionID(nil)

	if _, err := s.settingsRepo.Upsert(ctx, settings); err != nil {
		return nil, err
	}

	status := s.buildStatus(settings)

	return &dto.McpUpdateResponse{McpStatusResponse: *status}, nil
}

func (s *McpServiceImpl) RegenerateToken(ctx context.Context) (*dto.McpRegenerateTokenResponse, error) {
	settings, err := s.settingsRepo.FindByOwner(ctx, helper.CtxOwnerID(ctx))
	if err != nil {
		return nil, err
	}

	if !settings.Enabled {
		return nil, fmt.Errorf("mcp is not enabled")
	}

	token, hash, err := generateToken()
	if err != nil {
		return nil, err
	}

	settings.TokenHash = &hash
	if _, err := s.settingsRepo.Upsert(ctx, settings); err != nil {
		return nil, err
	}

	return &dto.McpRegenerateTokenResponse{Token: token}, nil
}

func (s *McpServiceImpl) AuthenticateToken(ctx context.Context, token string) (*model.McpSettings, bool) {
	if token == "" {
		return nil, false
	}

	hash := hashToken(token)

	settings, err := s.settingsRepo.FindByTokenHash(ctx, hash)
	if err != nil || settings == nil || !settings.Enabled || settings.TokenHash == nil {
		return nil, false
	}

	if subtle.ConstantTimeCompare([]byte(*settings.TokenHash), []byte(hash)) != 1 {
		return nil, false
	}

	return settings, true
}

func (s *McpServiceImpl) ValidateToken(ctx context.Context, token string) bool {
	_, ok := s.AuthenticateToken(ctx, token)
	return ok
}

func (s *McpServiceImpl) HTTPHandler() http.Handler {
	return s.nativeServer.HTTPHandler()
}

func (s *McpServiceImpl) IsEnabled(ctx context.Context) bool {
	settings, err := s.settingsRepo.FindByOwner(ctx, helper.CtxOwnerID(ctx))
	return err == nil && settings.Enabled
}

func (s *McpServiceImpl) buildStatus(settings *model.McpSettings) *dto.McpStatusResponse {
	masked := ""

	if settings.TokenHash != nil {
		hash := *settings.TokenHash
		if len(hash) >= 4 {
			masked = "****" + hash[len(hash)-4:]
		}
	}

	cfg := s.cfg.App

	return &dto.McpStatusResponse{
		Enabled:             settings.Enabled,
		Running:             settings.Enabled,
		Port:                settings.Port,
		ProxyURL:            cfg.MCPPublicURL(),
		TokenMasked:         masked,
		DefaultConnectionID: settings.DefaultConnectionID,
		Healthy:             settings.Enabled,
	}
}

func generateToken() (string, string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", "", err
	}

	token := hex.EncodeToString(buf)

	return token, hashToken(token), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func ExtractBearer(authHeader string) string {
	if authHeader == "" {
		return ""
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return ""
	}

	return strings.TrimSpace(parts[1])
}
