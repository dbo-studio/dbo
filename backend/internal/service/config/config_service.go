package serviceConfig

import (
	"context"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai_provider"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/gofiber/fiber/v3"
)

type IConfigService interface {
	Index(ctx context.Context) (*dto.ConfigListResponse, error)
	CheckUpdate(ctx context.Context) (*dto.ConfigCheckUpdateResponse, error)
	Logs(ctx fiber.Ctx) error
}

type IConfigServiceImpl struct {
	cfg               *config.Config
	aiProviderService serviceAiProvider.IAiProviderService
	cache             cache.Cache
}

func NewConfigService(cfg *config.Config, cache cache.Cache, aiProviderService serviceAiProvider.IAiProviderService) IConfigService {
	return &IConfigServiceImpl{
		cfg:               cfg,
		aiProviderService: aiProviderService,
		cache:             cache,
	}
}
