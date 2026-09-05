package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

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
	FindByOwner(ctx context.Context, id int32, ownerID string) (*model.Job, error)
	Update(ctx context.Context, job *model.Job) error
	// ClaimNextPending atomically flips the oldest pending job to running and
	// returns it; gorm.ErrRecordNotFound means there was nothing to claim or
	// the row was claimed concurrently.
	ClaimNextPending(ctx context.Context) (*model.Job, error)
	// UpdateFields writes only the given columns by ID so a stale in-memory
	// copy can never overwrite a concurrent status change (e.g. a cancel).
	UpdateFields(ctx context.Context, id uint, fields map[string]any) error
	UpdateProgress(ctx context.Context, id uint, progress int, message string) error
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
	Get(ctx context.Context, sessionID string) (*model.WebSession, error)
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
	HistoryRepo             IHistoryRepo
	SavedQueryRepo          ISavedQueryRepo
	JobRepo                 IJobRepo
	AiChatRepo              IAiChatRepo
	AiProviderRepo          IAiProviderRepo
	McpSettingsRepo         IMcpSettingsRepo
	SafeModePasswordRepo    ISafeModePasswordRepo
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{
		ConfigRepo:              NewConfigRepo(db),
		ConnectionRepo:          NewConnectionRepo(db),
		WebSessionRepo:          NewWebSessionRepo(db),
		WebConnectionSecretRepo: NewWebConnectionSecretRepo(db),
		HistoryRepo:             NewHistoryRepo(db),
		SavedQueryRepo:          NewSavedQueryRepo(db),
		JobRepo:                 NewJobRepo(db),
		AiChatRepo:              NewAiChatRepo(db),
		AiProviderRepo:          NewAiProviderRepo(db),
		McpSettingsRepo:         NewMcpSettingsRepo(db),
		SafeModePasswordRepo:    NewSafeModePasswordRepo(db),
	}
}
