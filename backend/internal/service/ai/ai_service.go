package serviceAi

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/repository"
	aiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	serviceAiChangeset "github.com/dbo-studio/dbo/internal/service/ai_changeset"
	serviceDashboard "github.com/dbo-studio/dbo/internal/service/dashboard"
	serviceDbtools "github.com/dbo-studio/dbo/internal/service/dbtools"
	serviceQuestion "github.com/dbo-studio/dbo/internal/service/question"
	serviceSchema "github.com/dbo-studio/dbo/internal/service/schema"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
)

type IAiService interface {
	Chat(ctx context.Context, req *dto.AiChatRequest) (*dto.AiChatResponse, error)
	ChatStream(ctx context.Context, req *dto.AiChatRequest, emit func([]byte) error) error
	Complete(ctx context.Context, req *dto.AiInlineCompleteRequest) (*dto.AiInlineCompleteResponse, error)
}

type AiServiceImpl struct {
	connectionRepo   repository.IConnectionRepo
	aiProviderRepo   repository.IAiProviderRepo
	aiChatRepo       repository.IAiChatRepo
	changesetService serviceAiChangeset.IAiChangesetService
	questionService  serviceQuestion.IQuestionService
	dashboardService serviceDashboard.IDashboardService
	schemaService    serviceSchema.ISchemaService
	cm               *databaseConnection.ConnectionManager
	toolRegistry     *serviceDbtools.Registry
	logger           logger.Logger
	providerFactory  *aiProvider.ProviderFactory
	cache            cache.Cache
}

func NewAiService(
	connectionRepo repository.IConnectionRepo,
	aiProviderRepo repository.IAiProviderRepo,
	aiChatRepo repository.IAiChatRepo,
	changesetService serviceAiChangeset.IAiChangesetService,
	questionService serviceQuestion.IQuestionService,
	dashboardService serviceDashboard.IDashboardService,
	schemaService serviceSchema.ISchemaService,
	cm *databaseConnection.ConnectionManager,
	toolRegistry *serviceDbtools.Registry,
	appLogger logger.Logger,
	appCache cache.Cache,
) IAiService {
	return &AiServiceImpl{
		connectionRepo:   connectionRepo,
		aiProviderRepo:   aiProviderRepo,
		aiChatRepo:       aiChatRepo,
		changesetService: changesetService,
		questionService:  questionService,
		dashboardService: dashboardService,
		schemaService:    schemaService,
		cm:               cm,
		toolRegistry:     toolRegistry,
		logger:           appLogger,
		cache:            appCache,
		providerFactory:  aiProvider.NewProviderFactory(),
	}
}
