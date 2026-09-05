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
	serviceDbtools "github.com/dbo-studio/dbo/internal/service/dbtools"
	serviceHistory "github.com/dbo-studio/dbo/internal/service/history"
	serviceImportExport "github.com/dbo-studio/dbo/internal/service/import_export"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	"github.com/dbo-studio/dbo/internal/service/job/processors"
	serviceMCP "github.com/dbo-studio/dbo/internal/service/mcp"
	serviceQuery "github.com/dbo-studio/dbo/internal/service/query"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	serviceSavedQuery "github.com/dbo-studio/dbo/internal/service/saved_query"
	serviceSchema "github.com/dbo-studio/dbo/internal/service/schema"
	serviceSecretStore "github.com/dbo-studio/dbo/internal/service/secret_store"
	serviceTree "github.com/dbo-studio/dbo/internal/service/tree"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
)

type Service struct {
	ConnectionService       serviceConnection.IConnectionService
	HistoryService          serviceHistory.IHistoryService
	SavedQueryService       serviceSavedQuery.ISavedQueryService
	TreeService             serviceTree.ITreeService
	QueryService            serviceQuery.IQueryService
	ImportExportService     serviceImportExport.IImportExport
	JobService              serviceJob.IJobService
	JobManager              serviceJob.IJobManager
	AiService               serviceAI.IAiService
	AiProviderService       serviceAiProvider.IAiProviderService
	AiChatService           serviceAiChat.IAiChatService
	ConfigService           serviceConfig.IConfigService
	McpService              serviceMCP.IMcpService
	SchemaService           serviceSchema.ISchemaService
	SafeModePasswordService serviceSafemode.ISafeModePasswordService
}

// Deps carries the process-wide dependencies services used to fetch from the
// global container themselves.
type Deps struct {
	Logger logger.Logger
	Cache  cache.Cache
	Config *config.Config
}

func NewService(repo *repository.Repository, cm *databaseConnection.ConnectionManager, ss serviceSecretStore.ISecretStore, deps Deps) *Service {
	jobManager := serviceJob.NewJobManager(repo.JobRepo, deps.Logger)

	jobManager.RegisterProcessor(processors.NewImportProcessor(jobManager, cm, repo.ConnectionRepo, ss, deps.Cache))
	jobManager.RegisterProcessor(processors.NewExportProcessor(jobManager, cm, repo.ConnectionRepo, ss, deps.Cache))

	aiProviderService := serviceAiProvider.NewAiProviderService(repo.AiProviderRepo)
	toolRegistry := serviceDbtools.NewRegistry(cm, repo.ConnectionRepo)
	mcpService := serviceMCP.NewMcpService(repo.McpSettingsRepo, repo.ConnectionRepo, toolRegistry, deps.Logger, deps.Config)
	safeModePasswordService := serviceSafemode.NewPasswordService(repo.SafeModePasswordRepo, deps.Config, deps.Logger, deps.Cache)

	return &Service{
		ConnectionService:       serviceConnection.NewConnectionService(repo.ConnectionRepo, cm, ss, safeModePasswordService, deps.Cache),
		HistoryService:          serviceHistory.NewHistoryService(repo.HistoryRepo),
		SavedQueryService:       serviceSavedQuery.NewSavedQueryService(repo.SavedQueryRepo),
		TreeService:             serviceTree.NewTreeService(repo.ConnectionRepo, cm, deps.Cache),
		QueryService:            serviceQuery.NewQueryService(repo.ConnectionRepo, repo.HistoryRepo, cm, deps.Cache),
		ImportExportService:     serviceImportExport.NewImportExportService(jobManager, deps.Config, deps.Logger),
		JobService:              serviceJob.NewJobService(repo.JobRepo, jobManager),
		JobManager:              jobManager,
		AiService:               serviceAI.NewAiService(repo.ConnectionRepo, repo.AiProviderRepo, repo.AiChatRepo, cm, toolRegistry, deps.Logger, deps.Cache),
		AiProviderService:       aiProviderService,
		AiChatService:           serviceAiChat.NewAiChatService(repo.AiChatRepo),
		ConfigService:           serviceConfig.NewConfigService(repo.ConfigRepo, aiProviderService, deps.Config, deps.Cache, deps.Logger),
		McpService:              mcpService,
		SchemaService:           serviceSchema.NewSchemaService(repo.ConnectionRepo, cm),
		SafeModePasswordService: safeModePasswordService,
	}
}
