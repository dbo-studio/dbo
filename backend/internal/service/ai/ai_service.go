package serviceAi

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
)

type IAiService interface {
	Chat(ctx context.Context, req *dto.AiChatRequest) (*dto.AiChatResponse, error)
	Complete(ctx context.Context, req *dto.AiInlineCompleteRequest) (*dto.AiInlineCompleteResponse, error)
}

type AiServiceImpl struct {
	connectionRepo  repository.IConnectionRepo
	aiProviderRepo  repository.IAiProviderRepo
	aiChatRepo      repository.IAiChatRepo
	cm              *databaseConnection.ConnectionManager
	logger          logger.Logger
	providerFactory *serviceAiProvider.ProviderFactory
	cache           cache.Cache
}

func NewAiService(
	connectionRepo repository.IConnectionRepo,
	aiProviderRepo repository.IAiProviderRepo,
	aiChatRepo repository.IAiChatRepo,
	cm *databaseConnection.ConnectionManager,
	cache cache.Cache,
	logger logger.Logger,
) IAiService {
	return &AiServiceImpl{
		connectionRepo:  connectionRepo,
		aiProviderRepo:  aiProviderRepo,
		aiChatRepo:      aiChatRepo,
		cm:              cm,
		logger:          logger,
		cache:           cache,
		providerFactory: serviceAiProvider.NewProviderFactory(),
	}
}
