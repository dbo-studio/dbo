package serviceConfig

import (
	"github.com/dbo-studio/dbo/pkg/logger"

	"context"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai_provider"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/response"
)

type IConfigService interface {
	Index(ctx context.Context) (*dto.ConfigListResponse, error)
	CheckUpdate(ctx context.Context) (*dto.ConfigCheckUpdateResponse, error)
	Logs(ctx context.Context) (*response.FileDownload, error)
	ResetFactory(ctx context.Context) error
}

type IConfigServiceImpl struct {
	cfg               *config.Config
	configRepo        repository.IConfigRepo
	aiProviderService serviceAiProvider.IAiProviderService
	cache             cache.Cache
	logger            logger.Logger
}

func NewConfigService(configRepo repository.IConfigRepo, aiProviderService serviceAiProvider.IAiProviderService, cfg *config.Config, appCache cache.Cache, appLogger logger.Logger) IConfigService {
	return &IConfigServiceImpl{
		cfg:               cfg,
		configRepo:        configRepo,
		aiProviderService: aiProviderService,
		cache:             appCache,
		logger:            appLogger,
	}
}
