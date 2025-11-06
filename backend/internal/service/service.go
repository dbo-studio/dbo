package service

import (
	"github.com/dbo-studio/dbo/config"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceAI "github.com/dbo-studio/dbo/internal/service/ai"
	serviceAiChat "github.com/dbo-studio/dbo/internal/service/ai_chat"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai_provider"
	serviceConfig "github.com/dbo-studio/dbo/internal/service/config"
	serviceConnection "github.com/dbo-studio/dbo/internal/service/connection"
	serviceHistory "github.com/dbo-studio/dbo/internal/service/history"
	serviceImportExport "github.com/dbo-studio/dbo/internal/service/import_export"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	"github.com/dbo-studio/dbo/internal/service/job/processors"
	serviceQuery "github.com/dbo-studio/dbo/internal/service/query"
	serviceSavedQuery "github.com/dbo-studio/dbo/internal/service/saved_query"
	serviceSchemaDiagram "github.com/dbo-studio/dbo/internal/service/schema_diagram"

	serviceTree "github.com/dbo-studio/dbo/internal/service/tree"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
)

type Service struct {
	ConnectionService     serviceConnection.IConnectionService
	HistoryService        serviceHistory.IHistoryService
	SavedQueryService     serviceSavedQuery.ISavedQueryService
	TreeService           serviceTree.ITreeService
	QueryService          serviceQuery.IQueryService
	ImportExportService   serviceImportExport.IImportExport
	JobService            serviceJob.IJobService
	JobManager            serviceJob.IJobManager
	AiService             serviceAI.IAiService
	AiProviderService     serviceAiProvider.IAiProviderService
	AiChatService         serviceAiChat.IAiChatService
	ConfigService         serviceConfig.IConfigService
	SchemaDiagramService  serviceSchemaDiagram.ISchemaDiagramService
}

func NewService(cfg *config.Config, logger logger.Logger, repo *repository.Repository, cm *databaseConnection.ConnectionManager, cache cache.Cache) *Service {
	jobRepo := repository.NewJobRepo(repo.DB)
	jobManager := serviceJob.NewJobManager(jobRepo, logger)

	jobManager.RegisterProcessor(processors.NewImportProcessor(jobManager, cm, repo.ConnectionRepo))
	jobManager.RegisterProcessor(processors.NewExportProcessor(jobManager, cm, repo.ConnectionRepo))

	aiProviderService := serviceAiProvider.NewAiProviderService(repo.AiProviderRepo)

	return &Service{
		ConnectionService:    serviceConnection.NewConnectionService(repo.ConnectionRepo, cm),
		HistoryService:       serviceHistory.NewHistoryService(repo.HistoryRepo),
		SavedQueryService:    serviceSavedQuery.NewSavedQueryService(repo.SavedQueryRepo),
		TreeService:          serviceTree.NewTreeService(cache, repo.ConnectionRepo, cm),
		QueryService:         serviceQuery.NewQueryService(repo.ConnectionRepo, repo.HistoryRepo, cm, cache),
		ImportExportService:  serviceImportExport.NewImportExportService(jobManager),
		JobService:           serviceJob.NewJobService(jobRepo),
		JobManager:           jobManager,
		AiService:            serviceAI.NewAiService(repo.ConnectionRepo, repo.AiProviderRepo, repo.AiChatRepo, cm, cache, logger),
		AiProviderService:    aiProviderService,
		AiChatService:        serviceAiChat.NewAiChatService(repo.AiChatRepo),
		ConfigService:        serviceConfig.NewConfigService(cfg, cache, aiProviderService),
		SchemaDiagramService: serviceSchemaDiagram.NewSchemaDiagramService(repo.ConnectionRepo, repo.SchemaDiagramRepo, cm),
	}
}
