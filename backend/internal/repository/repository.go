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
	FindByID(ctx context.Context, id int32) (*model.Connection, error)
	Create(ctx context.Context, dto *dto.CreateConnectionRequest) (*model.Connection, error)
	Delete(ctx context.Context, connection *model.Connection) error
	Update(ctx context.Context, connection *model.Connection, req *dto.UpdateConnectionRequest) (*model.Connection, error)
	UpdateVersion(ctx context.Context, connection *model.Connection, version string) (*model.Connection, error)
	MakeAllConnectionsNotDefault(ctx context.Context, exceptedConnection *model.Connection) error
	ListAll(ctx context.Context) ([]model.Connection, error)
}

type IConnectionShareRepo interface {
	ListByUser(ctx context.Context, userID string) ([]model.ConnectionShare, error)
	ListByConnection(ctx context.Context, connectionID uint) ([]model.ConnectionShare, error)
	ListAll(ctx context.Context) ([]model.ConnectionShare, error)
	Find(ctx context.Context, connectionID uint, userID string) (*model.ConnectionShare, error)
	Upsert(ctx context.Context, share *model.ConnectionShare) error
	Delete(ctx context.Context, connectionID uint, userID string) error
	DeleteByConnection(ctx context.Context, connectionID uint) error
}

type IConnectionSharedSecretRepo interface {
	Find(ctx context.Context, connectionID uint) (*model.ConnectionSharedSecret, error)
	Upsert(ctx context.Context, secret *model.ConnectionSharedSecret) error
	Delete(ctx context.Context, connectionID uint) error
	ListConnectionIDs(ctx context.Context, ids []uint) ([]uint, error)
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
	UpdateFieldsIfRunning(ctx context.Context, id uint, fields map[string]any) error
	UpdateFieldsIfActive(ctx context.Context, id uint, fields map[string]any) error
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
	CreateWithParams(ctx context.Context, params CreateSessionParams) (string, error)
	Get(ctx context.Context, sessionID string) (*model.WebSession, error)
	Delete(ctx context.Context, sessionID string) error
	DeleteByUserID(ctx context.Context, userID string) error
	EnsureSession(ctx context.Context, sessionID string) error
	TouchLastSeen(ctx context.Context, sessionID string, at time.Time) error
	TouchLastSeenDebounced(ctx context.Context, sessionID string, interval time.Duration) error
}

type IUserRepo interface {
	Count(ctx context.Context) (int64, error)
	FindByID(ctx context.Context, id string) (*model.User, error)
	FindByEmail(ctx context.Context, email string) (*model.User, error)
	FindFirstAdmin(ctx context.Context) (*model.User, error)
	List(ctx context.Context) ([]model.User, error)
	Create(ctx context.Context, user *model.User) error
	Update(ctx context.Context, user *model.User) error
	ReassignOwners(ctx context.Context, toOwnerID string) error
}

type IWebConnectionSecretRepo interface {
	Upsert(ctx context.Context, secret *model.WebConnectionSecret) error
	FindBySessionAndConnection(ctx context.Context, sessionID string, connectionID uint) (*model.WebConnectionSecret, error)
	Delete(ctx context.Context, sessionID string, connectionID uint) error
	DeleteByConnection(ctx context.Context, connectionID uint) error
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
	UpdateContext(ctx context.Context, chatID uint, contextJSON string) error
	UpdateSummary(ctx context.Context, chatID uint, summary string, upTo uint) error
	Create(ctx context.Context, dto *dto.AiChatCreateRequest) (*model.AiChat, error)
	Delete(ctx context.Context, chat *model.AiChat) error
	AddMessage(ctx context.Context, m *model.AiChatMessage) error
}

type IAiChangesetRepo interface {
	List(ctx context.Context, chatID uint) ([]model.AiChangeset, error)
	Find(ctx context.Context, chatID, id uint) (*model.AiChangeset, error)
	Create(ctx context.Context, changeset *model.AiChangeset) error
	AddOps(ctx context.Context, ops []model.AiChangesetOp) error
	SaveOps(ctx context.Context, ops []model.AiChangesetOp) error
}

type IQuestionRepo interface {
	List(ctx context.Context, connectionID uint) ([]model.Question, error)
	Find(ctx context.Context, id uint) (*model.Question, error)
	Create(ctx context.Context, question *model.Question) error
	Save(ctx context.Context, question *model.Question) error
	Delete(ctx context.Context, question *model.Question) error
}

type IDashboardRepo interface {
	List(ctx context.Context, connectionID uint) ([]model.Dashboard, error)
	Find(ctx context.Context, id uint) (*model.Dashboard, error)
	FindByName(ctx context.Context, connectionID uint, name string) (*model.Dashboard, error)
	Create(ctx context.Context, dashboard *model.Dashboard) error
	Rename(ctx context.Context, dashboard *model.Dashboard) error
	Delete(ctx context.Context, dashboard *model.Dashboard) error
	AddCard(ctx context.Context, card *model.DashboardCard) error
	SaveCard(ctx context.Context, card *model.DashboardCard) error
	DeleteCard(ctx context.Context, card *model.DashboardCard) error
}

type IDashboardShareRepo interface {
	List(ctx context.Context, dashboardID uint) ([]model.DashboardShare, error)
	Find(ctx context.Context, dashboardID, id uint) (*model.DashboardShare, error)
	FindByTokenHash(ctx context.Context, hash string) (*model.DashboardShare, error)
	Create(ctx context.Context, share *model.DashboardShare) error
	Save(ctx context.Context, share *model.DashboardShare) error
	RecordView(ctx context.Context, id uint) error
}

type IDashboardSubscriptionRepo interface {
	List(ctx context.Context, dashboardID uint) ([]model.DashboardSubscription, error)
	Find(ctx context.Context, dashboardID, id uint) (*model.DashboardSubscription, error)
	Due(ctx context.Context, now time.Time, limit int) ([]model.DashboardSubscription, error)
	Overdue(ctx context.Context, cutoff time.Time) ([]model.DashboardSubscription, error)
	Create(ctx context.Context, sub *model.DashboardSubscription) error
	Save(ctx context.Context, sub *model.DashboardSubscription) error
	// SetNextRun moves only the next run; the scheduler uses it so a user's edit is not overwritten.
	SetNextRun(ctx context.Context, id uint, next time.Time) error
	// SaveResult stores what a run left behind (last run, status, failures, and whether it was paused).
	SaveResult(ctx context.Context, sub *model.DashboardSubscription) error
	Delete(ctx context.Context, sub *model.DashboardSubscription) error
	AddRun(ctx context.Context, run *model.DashboardSubscriptionRun) error
	Runs(ctx context.Context, subscriptionID uint) ([]model.DashboardSubscriptionRun, error)
	GetSmtp(ctx context.Context) (*model.SmtpSettings, error)
	SaveSmtp(ctx context.Context, settings *model.SmtpSettings) error
}

type IAiAuditRepo interface {
	Create(ctx context.Context, entry *model.AiAuditEntry) error
	List(ctx context.Context, req *dto.AiAuditListRequest) ([]model.AiAuditEntry, error)
}

type Repository struct {
	ConfigRepo                 IConfigRepo
	ConnectionRepo             IConnectionRepo
	ConnectionShareRepo        IConnectionShareRepo
	ConnectionSharedSecretRepo IConnectionSharedSecretRepo
	WebSessionRepo             IWebSessionRepo
	WebConnectionSecretRepo    IWebConnectionSecretRepo
	UserRepo                   IUserRepo
	HistoryRepo                IHistoryRepo
	SavedQueryRepo             ISavedQueryRepo
	JobRepo                    IJobRepo
	AiChatRepo                 IAiChatRepo
	AiChangesetRepo            IAiChangesetRepo
	AiAuditRepo                IAiAuditRepo
	QuestionRepo               IQuestionRepo
	DashboardRepo              IDashboardRepo
	DashboardShareRepo         IDashboardShareRepo
	DashboardSubscriptionRepo  IDashboardSubscriptionRepo
	AiProviderRepo             IAiProviderRepo
	McpSettingsRepo            IMcpSettingsRepo
	SafeModePasswordRepo       ISafeModePasswordRepo
	TotpLoginChallengeRepo     ITotpLoginChallengeRepo
}

func NewRepository(db *gorm.DB, aiCipherKey []byte) *Repository {
	return &Repository{
		ConfigRepo:                 NewConfigRepo(db),
		ConnectionRepo:             NewConnectionRepo(db),
		ConnectionShareRepo:        NewConnectionShareRepo(db),
		ConnectionSharedSecretRepo: NewConnectionSharedSecretRepo(db),
		WebSessionRepo:             NewWebSessionRepo(db),
		WebConnectionSecretRepo:    NewWebConnectionSecretRepo(db),
		UserRepo:                   NewUserRepo(db),
		HistoryRepo:                NewHistoryRepo(db),
		SavedQueryRepo:             NewSavedQueryRepo(db),
		JobRepo:                    NewJobRepo(db),
		AiChatRepo:                 NewAiChatRepo(db),
		AiChangesetRepo:            NewAiChangesetRepo(db),
		AiAuditRepo:                NewAiAuditRepo(db),
		QuestionRepo:               NewQuestionRepo(db),
		DashboardRepo:              NewDashboardRepo(db),
		DashboardShareRepo:         NewDashboardShareRepo(db),
		DashboardSubscriptionRepo:  NewDashboardSubscriptionRepo(db),
		AiProviderRepo:             NewAiProviderRepo(db, aiCipherKey),
		McpSettingsRepo:            NewMcpSettingsRepo(db),
		SafeModePasswordRepo:       NewSafeModePasswordRepo(db),
		TotpLoginChallengeRepo:     NewTotpLoginChallengeRepo(db),
	}
}
