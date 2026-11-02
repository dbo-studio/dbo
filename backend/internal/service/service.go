package service

import (
	"github.com/dbo-studio/dbo/config"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceAccount "github.com/dbo-studio/dbo/internal/service/account"
	serviceAdminUsers "github.com/dbo-studio/dbo/internal/service/admin_users"
	serviceAI "github.com/dbo-studio/dbo/internal/service/ai"
	serviceAiChangeset "github.com/dbo-studio/dbo/internal/service/ai_changeset"
	serviceAiChat "github.com/dbo-studio/dbo/internal/service/ai_chat"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai_provider"
	serviceAuth "github.com/dbo-studio/dbo/internal/service/auth"
	serviceBackup "github.com/dbo-studio/dbo/internal/service/backup"
	serviceConfig "github.com/dbo-studio/dbo/internal/service/config"
	serviceConnection "github.com/dbo-studio/dbo/internal/service/connection"
	serviceDashboard "github.com/dbo-studio/dbo/internal/service/dashboard"
	serviceDbtools "github.com/dbo-studio/dbo/internal/service/dbtools"
	serviceEvents "github.com/dbo-studio/dbo/internal/service/events"
	serviceHistory "github.com/dbo-studio/dbo/internal/service/history"
	serviceImportExport "github.com/dbo-studio/dbo/internal/service/import_export"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	"github.com/dbo-studio/dbo/internal/service/job/processors"
	serviceMCP "github.com/dbo-studio/dbo/internal/service/mcp"
	serviceNotification "github.com/dbo-studio/dbo/internal/service/notification"
	serviceQuery "github.com/dbo-studio/dbo/internal/service/query"
	serviceQuestion "github.com/dbo-studio/dbo/internal/service/question"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	serviceSavedQuery "github.com/dbo-studio/dbo/internal/service/saved_query"
	serviceSchema "github.com/dbo-studio/dbo/internal/service/schema"
	serviceSecretStore "github.com/dbo-studio/dbo/internal/service/secret_store"
	serviceTree "github.com/dbo-studio/dbo/internal/service/tree"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
)

type Service struct {
	ConnectionService            serviceConnection.IConnectionService
	HistoryService               serviceHistory.IHistoryService
	SavedQueryService            serviceSavedQuery.ISavedQueryService
	QuestionService              serviceQuestion.IQuestionService
	DashboardService             serviceDashboard.IDashboardService
	DashboardShareService        serviceDashboard.IShareService
	EventHub                     serviceEvents.IHub
	NotificationService          serviceNotification.INotificationService
	DashboardSubscriptionService serviceDashboard.ISubscriptionService
	TreeService                  serviceTree.ITreeService
	QueryService                 serviceQuery.IQueryService
	ImportExportService          serviceImportExport.IImportExport
	JobService                   serviceJob.IJobService
	JobManager                   serviceJob.IJobManager
	BackupService                serviceBackup.IBackupService
	BackupScheduleService        serviceBackup.IBackupScheduleService
	BackupScheduler              *serviceBackup.Scheduler
	AiService                    serviceAI.IAiService
	AiProviderService            serviceAiProvider.IAiProviderService
	AiChatService                serviceAiChat.IAiChatService
	AiChangesetService           serviceAiChangeset.IAiChangesetService
	ConfigService                serviceConfig.IConfigService
	AccountService               serviceAccount.IAccountService
	McpService                   serviceMCP.IMcpService
	SchemaService                serviceSchema.ISchemaService
	SafeModePasswordService      serviceSafemode.ISafeModePasswordService
	AuthService                  serviceAuth.IAuthService
	AdminUsersService            serviceAdminUsers.IAdminUsersService
}

// Deps carries the process-wide dependencies services used to fetch from the
// global container themselves.
type Deps struct {
	Logger    logger.Logger
	Cache     cache.Cache
	Config    *config.Config
	CipherKey []byte
}

func NewService(repo *repository.Repository, cm *databaseConnection.ConnectionManager, ss serviceSecretStore.ISecretStore, deps Deps) *Service {
	eventHub := serviceEvents.NewHub()
	notificationService := serviceNotification.NewNotificationService(repo.NotificationRepo, eventHub)
	jobManager := serviceJob.NewJobManager(repo.JobRepo, deps.Logger, eventHub, notificationService)

	jobManager.RegisterProcessor(processors.NewImportProcessor(jobManager, cm, repo.ConnectionRepo, ss, deps.Cache))
	jobManager.RegisterProcessor(processors.NewExportProcessor(jobManager, cm, repo.ConnectionRepo, ss, deps.Cache))
	jobManager.RegisterProcessor(processors.NewBackupProcessor(jobManager, cm, repo.ConnectionRepo, repo.BackupArtifactRepo, repo.BackupScheduleRepo, ss, deps.Cache))
	jobManager.RegisterProcessor(processors.NewRestoreProcessor(jobManager, cm, repo.ConnectionRepo, repo.BackupArtifactRepo, ss))
	jobManager.RegisterProcessor(processors.NewToolInstallProcessor(jobManager))

	aiProviderService := serviceAiProvider.NewAiProviderService(repo.AiProviderRepo)
	toolRegistry := serviceDbtools.NewRegistry(cm, repo.ConnectionRepo, deps.Cache)
	questionService := serviceQuestion.NewQuestionService(repo.QuestionRepo, repo.ConnectionRepo, toolRegistry)
	dashboardService := serviceDashboard.NewDashboardService(repo.DashboardRepo, repo.QuestionRepo, repo.ConnectionRepo)
	dashboardShareService := serviceDashboard.NewShareService(repo.DashboardShareRepo, repo.DashboardRepo, questionService, deps.Config, deps.Logger)
	dashboardSubscriptionService := serviceDashboard.NewSubscriptionService(repo.DashboardSubscriptionRepo, repo.DashboardRepo, questionService, deps.Config, deps.CipherKey, deps.Logger, notificationService)
	mcpService := serviceMCP.NewMcpService(repo.McpSettingsRepo, repo.ConnectionRepo, toolRegistry, deps.Logger, deps.Config)
	safeModePasswordService := serviceSafemode.NewPasswordService(repo.SafeModePasswordRepo, deps.Config, deps.Logger, deps.Cache)
	authService := serviceAuth.NewAuthService(
		repo.UserRepo,
		repo.WebSessionRepo,
		repo.TotpLoginChallengeRepo,
		deps.CipherKey,
		deps.Config,
		deps.Logger,
	)
	schemaService := serviceSchema.NewSchemaService(repo.ConnectionRepo, cm, deps.Cache)
	aiChangesetService := serviceAiChangeset.NewAiChangesetService(repo.AiChangesetRepo, repo.AiAuditRepo, repo.AiChatRepo, repo.ConnectionRepo, schemaService, deps.Logger)
	adminUsersService := serviceAdminUsers.NewAdminUsersService(repo.UserRepo, repo.WebSessionRepo)

	return &Service{
		ConnectionService:            serviceConnection.NewConnectionService(repo.ConnectionRepo, repo.ConnectionShareRepo, repo.UserRepo, cm, ss, safeModePasswordService, deps.Cache, deps.Logger),
		HistoryService:               serviceHistory.NewHistoryService(repo.HistoryRepo, repo.ConnectionRepo),
		SavedQueryService:            serviceSavedQuery.NewSavedQueryService(repo.SavedQueryRepo, repo.ConnectionRepo),
		QuestionService:              questionService,
		DashboardService:             dashboardService,
		DashboardShareService:        dashboardShareService,
		EventHub:                     eventHub,
		NotificationService:          notificationService,
		DashboardSubscriptionService: dashboardSubscriptionService,
		TreeService:                  serviceTree.NewTreeService(repo.ConnectionRepo, cm, deps.Cache),
		QueryService:                 serviceQuery.NewQueryService(repo.ConnectionRepo, repo.HistoryRepo, cm, deps.Cache, jobManager),
		ImportExportService:          serviceImportExport.NewImportExportService(jobManager, deps.Config, deps.Logger),
		JobService:                   serviceJob.NewJobService(repo.JobRepo, jobManager),
		JobManager:                   jobManager,
		BackupScheduleService:        serviceBackup.NewBackupScheduleService(jobManager, repo.ConnectionRepo, repo.ConnectionShareRepo, repo.BackupScheduleRepo, ss),
		BackupScheduler:              serviceBackup.NewScheduler(repo.BackupScheduleRepo, jobManager, repo.JobRepo, deps.Logger),
		BackupService:                serviceBackup.NewBackupService(jobManager, repo.ConnectionRepo, repo.ConnectionShareRepo, repo.BackupArtifactRepo, deps.Cache),
		AiService:                    serviceAI.NewAiService(repo.ConnectionRepo, repo.AiProviderRepo, repo.AiChatRepo, aiChangesetService, questionService, dashboardService, schemaService, cm, toolRegistry, deps.Logger, deps.Cache),
		AiProviderService:            aiProviderService,
		AiChatService:                serviceAiChat.NewAiChatService(repo.AiChatRepo, repo.ConnectionRepo, deps.Config),
		AiChangesetService:           aiChangesetService,
		AccountService:               serviceAccount.NewAccountService(deps.Config),
		ConfigService:                serviceConfig.NewConfigService(repo.ConfigRepo, aiProviderService, authService, deps.Config, deps.Cache, deps.Logger),
		McpService:                   mcpService,
		SchemaService:                schemaService,
		SafeModePasswordService:      safeModePasswordService,
		AuthService:                  authService,
		AdminUsersService:            adminUsersService,
	}
}
