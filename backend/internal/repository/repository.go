package repository

import (
	"context"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
)

type IConnectionRepo interface {
	Index(ctx context.Context) (*[]model.Connection, error)
	Find(ctx context.Context, id int32) (*model.Connection, error)
	FindByIDAndOwner(ctx context.Context, id int32, ownerID string) (*model.Connection, error)
	Create(ctx context.Context, dto *dto.CreateConnectionRequest) (*model.Connection, error)
	Delete(ctx context.Context, connection *model.Connection) error
	Update(ctx context.Context, connection *model.Connection, req *dto.UpdateConnectionRequest) (*model.Connection, error)
	UpdateVersion(ctx context.Context, connection *model.Connection, version string) (*model.Connection, error)
	MakeAllConnectionsNotDefault(ctx context.Context, exceptedConnection *model.Connection) error
}

type ICacheRepo interface {
	GetDatabaseVersion(ctx context.Context, connectionID uint, fromCache bool) (string, error)
	GetConnectionDatabases(ctx context.Context, connectionID uint, fromCache bool) ([]string, error)
	GetConnectionSchemas(ctx context.Context, connectionID uint, databaseName string, fromCache bool) ([]string, error)
	GeDatabaseTables(ctx context.Context, connectionID uint, schemaName string, fromCache bool) ([]string, error)
	FlushCache(ctx context.Context) error
}

type IHistoryRepo interface {
	Index(ctx context.Context, pagination *dto.HistoryListRequest) (*[]model.History, error)
	Create(ctx context.Context, connectionID uint, query string, isSystem bool) error
	DeleteAll(_ context.Context, connectionID uint) error
}

type ISavedQueryRepo interface {
	Index(ctx context.Context, pagination *dto.SavedQueryListRequest) (*[]model.SavedQuery, error)
	Find(ctx context.Context, id int32) (*model.SavedQuery, error)
	Create(ctx context.Context, dto *dto.CreateSavedQueryRequest) (*model.SavedQuery, error)
	Delete(ctx context.Context, query *model.SavedQuery) error
	Update(ctx context.Context, query *model.SavedQuery, req *dto.UpdateSavedQueryRequest) (*model.SavedQuery, error)
}

type IJobRepo interface {
	Create(ctx context.Context, job *model.Job) error
	Find(ctx context.Context, id int32) (*model.Job, error)
	Update(ctx context.Context, job *model.Job) error
	GetPendingJobs(ctx context.Context) ([]model.Job, error)
	GetRunningJobs(ctx context.Context) ([]model.Job, error)
	DeleteOldJobs(ctx context.Context, days int) error
}

type IAiProviderRepo interface {
	Index(ctx context.Context) ([]model.AiProvider, error)
	Find(ctx context.Context, id uint) (*model.AiProvider, error)
	FindActive(ctx context.Context) (*model.AiProvider, error)
	CreateIfNotExists(ctx context.Context, provider *model.AiProvider) (*model.AiProvider, error)
	Update(ctx context.Context, provider *model.AiProvider, dto *dto.AiProviderUpdateRequest) (*model.AiProvider, error)
	MakeAllProvidersNotActive(ctx context.Context, provider *model.AiProvider, req *dto.AiProviderUpdateRequest) error
}

type IConfigRepo interface {
	TruncateAllTables(ctx context.Context) error
}

type IWebSessionRepo interface {
	Create(ctx context.Context) (string, error)
	CreateOrUpdate(ctx context.Context, sessionID string) (string, error)
	EnsureSession(ctx context.Context, sessionID string) error
	TouchLastSeen(ctx context.Context, sessionID string, at time.Time) error
	TouchLastSeenDebounced(ctx context.Context, sessionID string, interval time.Duration) error
}

type IWebConnectionSecretRepo interface {
	Upsert(ctx context.Context, secret *model.WebConnectionSecret) error
	FindBySessionAndConnection(ctx context.Context, sessionID string, connectionID uint) (*model.WebConnectionSecret, error)
	Delete(ctx context.Context, sessionID string, connectionID uint) error
	UpdateExpiry(ctx context.Context, sessionID string, connectionID uint, expiresAt *time.Time, updatedAt time.Time) error
}

type ISafeModePasswordRepo interface {
	FindByOwner(ctx context.Context, ownerID string) (*model.SafeModePassword, error)
	Upsert(ctx context.Context, item *model.SafeModePassword) error
}

type IAiChatRepo interface {
	List(ctx context.Context, req *dto.AiChatListRequest) ([]model.AiChat, error)
	Find(ctx context.Context, id uint, pagination *dto.PaginationRequest) (*model.AiChat, error)
	Update(ctx context.Context, chat *model.AiChat) error
	Create(ctx context.Context, dto *dto.AiChatCreateRequest) (*model.AiChat, error)
	Delete(ctx context.Context, chat *model.AiChat) error
	AddMessage(ctx context.Context, m *model.AiChatMessage) error
}

type Repository struct {
	ConfigRepo              IConfigRepo
	ConnectionRepo          IConnectionRepo
	WebSessionRepo          IWebSessionRepo
	WebConnectionSecretRepo IWebConnectionSecretRepo
	CacheRepo               ICacheRepo
	HistoryRepo             IHistoryRepo
	SavedQueryRepo          ISavedQueryRepo
	JobRepo                 IJobRepo
	AiChatRepo              IAiChatRepo
	AiProviderRepo          IAiProviderRepo
	McpSettingsRepo         IMcpSettingsRepo
	SafeModePasswordRepo    ISafeModePasswordRepo
}

func NewRepository() *Repository {
	return &Repository{
		ConfigRepo:              NewConfigRepo(),
		ConnectionRepo:          NewConnectionRepo(),
		WebSessionRepo:          NewWebSessionRepo(),
		WebConnectionSecretRepo: NewWebConnectionSecretRepo(),
		HistoryRepo:             NewHistoryRepo(),
		SavedQueryRepo:          NewSavedQueryRepo(),
		JobRepo:                 NewJobRepo(),
		AiChatRepo:              NewAiChatRepo(),
		AiProviderRepo:          NewAiProviderRepo(),
		McpSettingsRepo:         NewMcpSettingsRepo(),
		SafeModePasswordRepo:    NewSafeModePasswordRepo(),
	}
}
