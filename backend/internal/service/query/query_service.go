package serviceQuery

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
	"github.com/dbo-studio/dbo/pkg/txsession"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type IQueryService interface {
	Run(ctx context.Context, req *dto.RunQueryRequest) (*dto.RunQueryResponse, error)
	Raw(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error)
	// RunOrBackground and RawOrBackground are Run and Raw for the HTTP request: a query that outlasts the
	// request's wait moves to the background, and then jobID is set and the result is nil.
	RunOrBackground(ctx context.Context, req *dto.RunQueryRequest) (result *dto.RunQueryResponse, jobID uint, err error)
	RawOrBackground(ctx context.Context, req *dto.RawQueryRequest) (result *dto.RawQueryResponse, jobID uint, err error)
	Update(ctx context.Context, req *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error)
	AutoComplete(ctx context.Context, req *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error)
	// TransactionBegin opens a transaction that the tab's raw queries run in until TransactionEnd.
	TransactionBegin(ctx context.Context, req *dto.TransactionRequest) error
	TransactionEnd(ctx context.Context, req *dto.TransactionRequest, commit bool) error
	TransactionActive(ctx context.Context, req *dto.TransactionRequest) bool
}

var _ IQueryService = (*IQueryServiceImpl)(nil)

type IQueryServiceImpl struct {
	historyRepo    repository.IHistoryRepo
	connectionRepo repository.IConnectionRepo
	cm             *databaseConnection.ConnectionManager
	cache          cache.Cache
	unlockStore    *serviceSafemode.UnlockStore
	jobs           serviceJob.IJobManager
	transactions   *txsession.Store
}

func NewQueryService(connectionRepo repository.IConnectionRepo, historyRepo repository.IHistoryRepo, cm *databaseConnection.ConnectionManager, appCache cache.Cache, jobs serviceJob.IJobManager) IQueryService {
	c := appCache

	return &IQueryServiceImpl{
		historyRepo:    historyRepo,
		connectionRepo: connectionRepo,
		cm:             cm,
		cache:          c,
		unlockStore:    serviceSafemode.NewUnlockStore(c),
		jobs:           jobs,
		transactions:   txsession.NewStore(),
	}
}

// defaultBackgroundAfter is how long a query holds its request before it moves to the background.
const defaultBackgroundAfter = 10 * time.Second

func backgroundWait(seconds *int) time.Duration {
	if seconds == nil {
		return defaultBackgroundAfter
	}

	return time.Duration(*seconds) * time.Second
}

// handover runs fn in the request, or in the background past the wait. kind and req are stored on the job so a
// notification can rebuild the tab the query came from.
func handover[T any](ctx context.Context, jobs serviceJob.IJobManager, wait time.Duration, kind string, req any, fn func(ctx context.Context) (*T, error)) (*T, uint, error) {
	if wait == 0 {
		result, err := fn(ctx)

		return result, 0, err
	}

	data, err := json.Marshal(map[string]any{"kind": kind, "request": req})
	if err != nil {
		return nil, 0, apperror.InternalServerError(err)
	}

	value, jobID, err := jobs.RunWithHandover(ctx, serviceJob.HandoverOptions{Type: model.JobTypeQuery, Data: string(data), Wait: wait},
		func(runCtx context.Context) (any, error) { return fn(runCtx) })
	if err != nil || jobID != 0 {
		return nil, jobID, err
	}

	result, _ := value.(*T)

	return result, 0, nil
}

func (i IQueryServiceImpl) RunOrBackground(ctx context.Context, req *dto.RunQueryRequest) (*dto.RunQueryResponse, uint, error) {
	return handover(ctx, i.jobs, backgroundWait(req.BackgroundAfterSeconds), "run", req, func(runCtx context.Context) (*dto.RunQueryResponse, error) {
		return i.Run(runCtx, req)
	})
}

func (i IQueryServiceImpl) RawOrBackground(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, uint, error) {
	// A background job could not share the tab's pinned connection.
	if req.TransactionTab != "" {
		result, err := i.Raw(ctx, req)

		return result, 0, err
	}

	return handover(ctx, i.jobs, backgroundWait(req.BackgroundAfterSeconds), "raw", req, func(runCtx context.Context) (*dto.RawQueryResponse, error) {
		return i.Raw(runCtx, req)
	})
}

func (i IQueryServiceImpl) Run(ctx context.Context, req *dto.RunQueryRequest) (*dto.RunQueryResponse, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	if inline := strings.TrimSpace(lo.FromPtr(req.InlineQuery)); inline != "" {
		filter, err := databaseContract.ParseInlineQueryPredicate(inline)
		if err != nil {
			return nil, apperror.BadRequest(apperror.ErrInvalidInlineQuery)
		}

		if err := filter.Validate(); err != nil {
			return nil, apperror.Validation(err)
		}

		req.Filters = append([]dto.FilterDto{filter}, req.Filters...)
		req.InlineQuery = nil
	}

	policy := serviceSafemode.FromConnection(connection)
	policy = i.unlockStore.WithUnlock(ctx, helper.CtxOwnerID(ctx), connection.ID, policy)

	if err := serviceSafemode.Enforce(policy, sqlguard.ClassRead, req.Confirmed); err != nil {
		return nil, err
	}

	i.unlockStore.ConsumeGate(ctx, helper.CtxOwnerID(ctx), connection.ID, policy.Unlocked)

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm)
	if err != nil {
		return nil, err
	}

	return repo.RunQuery(ctx, req)
}

func (i IQueryServiceImpl) Raw(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	policy := serviceSafemode.FromConnection(connection)
	policy = i.unlockStore.WithUnlock(ctx, helper.CtxOwnerID(ctx), connection.ID, policy)

	classification := sqlguard.ClassifySQL(req.Query)
	if err := serviceSafemode.Enforce(policy, classification.Class, req.Confirmed); err != nil {
		return nil, err
	}

	i.unlockStore.ConsumeGate(ctx, helper.CtxOwnerID(ctx), connection.ID, policy.Unlocked)

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm)
	if err != nil {
		return nil, err
	}

	originalQuery := req.Query

	err = i.historyRepo.Create(ctx, connection.ID, originalQuery, false)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	limit, page := sqlguard.ResolveLimitPage(req.Limit, req.Page)
	// T-SQL has no LIMIT: the runner stops reading at `limit` rows instead, so SQL Server has no later pages.
	applied := sqlguard.LimitApplyResult{Query: originalQuery}
	if connection.ConnectionType != databaseContract.SQLServer {
		applied = sqlguard.ApplyLimitOffset(originalQuery, limit, page)
	}

	execReq := *req
	execReq.Query = applied.Query
	execReq.Limit = &limit
	execReq.Page = &page

	var resp *dto.RawQueryResponse

	if req.TransactionTab == "" {
		resp, err = repo.RunRawQuery(ctx, &execReq)
	} else {
		err = i.transactions.Use(txKey(ctx, req.ConnectionID, req.TransactionTab), func(tx *gorm.DB) error {
			var runErr error

			resp, runErr = repo.RunRawQuery(txsession.WithTx(ctx, tx), &execReq)

			return runErr
		})
		if errors.Is(err, txsession.ErrMissing) {
			return nil, apperror.Conflict(err)
		}
	}

	if err != nil {
		return nil, err
	}

	if resp == nil {
		return nil, nil
	}

	resp.Query = originalQuery
	resp.Paginated = applied.Paginated
	resp.Limit = limit
	resp.Page = page

	return resp, nil
}

func (i IQueryServiceImpl) Update(ctx context.Context, req *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	class := sqlguard.ClassWriteDML
	if len(req.DeletedItems) > 0 {
		class = sqlguard.ClassWriteDML
	}

	policy := serviceSafemode.FromConnection(connection)

	policy = i.unlockStore.WithUnlock(ctx, helper.CtxOwnerID(ctx), connection.ID, policy)
	if err := serviceSafemode.Enforce(policy, class, req.Confirmed); err != nil {
		return nil, err
	}

	i.unlockStore.ConsumeGate(ctx, helper.CtxOwnerID(ctx), connection.ID, policy.Unlocked)

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm)
	if err != nil {
		return nil, err
	}

	return repo.UpdateQuery(ctx, req)
}

func (i IQueryServiceImpl) AutoComplete(ctx context.Context, req *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	// A NoSQL connection has no SQL schema to complete from; answer with nothing instead of failing the editor.
	if databaseContract.IsNoSQL(connection.ConnectionType) {
		return &dto.AutoCompleteResponse{Databases: []string{}, Schemas: []string{}, Tables: []string{}, Views: []string{}, Columns: map[string][]string{}}, nil
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm)
	if err != nil {
		return nil, err
	}

	resultFromCache, err := i.findResultFromCache(ctx, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if resultFromCache != nil {
		return resultFromCache, nil
	}

	autocomplete, err := repo.AutoComplete(ctx, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	ttl := 60 * time.Minute

	err = i.cache.Set(ctx, cache.AutoCompleteKey(helper.CtxOwnerID(ctx), uint(req.ConnectionID), lo.FromPtr(req.Database), lo.FromPtr(req.Schema)), autocomplete, &ttl)
	if err != nil {
		return nil, err
	}

	return autocomplete, nil
}

func (i IQueryServiceImpl) findResultFromCache(ctx context.Context, req *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	var result *dto.AutoCompleteResponse

	err := i.cache.ConditionalGet(
		ctx,
		cache.AutoCompleteKey(helper.CtxOwnerID(ctx), uint(req.ConnectionID), lo.FromPtr(req.Database), lo.FromPtr(req.Schema)),
		&result,
		true,
	)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func txKey(ctx context.Context, connectionID int32, tab string) txsession.Key {
	return txsession.Key{Owner: helper.CtxOwnerID(ctx), ConnectionID: connectionID, Tab: tab}
}

func (i IQueryServiceImpl) TransactionBegin(ctx context.Context, req *dto.TransactionRequest) error {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	if databaseContract.IsNoSQL(connection.ConnectionType) {
		return apperror.BadRequest(errors.New("transactions are not supported for this connection"))
	}

	db, err := i.cm.GetConnection(ctx, connection, true)
	if databaseContract.IsPostgresFamily(connection.ConnectionType) && req.Database != "" {
		db, err = i.cm.GetConnectionForDatabase(ctx, connection, req.Database, true)
	}

	if err != nil {
		return apperror.InternalServerError(err)
	}

	if err := i.transactions.Begin(txKey(ctx, req.ConnectionID, req.Tab), db); err != nil {
		if errors.Is(err, txsession.ErrActive) {
			return apperror.Conflict(err)
		}

		return apperror.InternalServerError(err)
	}

	return nil
}

func (i IQueryServiceImpl) TransactionEnd(ctx context.Context, req *dto.TransactionRequest, commit bool) error {
	err := i.transactions.End(txKey(ctx, req.ConnectionID, req.Tab), commit)
	if errors.Is(err, txsession.ErrMissing) {
		return apperror.Conflict(err)
	}

	if err != nil {
		return apperror.InternalServerError(err)
	}

	return nil
}

func (i IQueryServiceImpl) TransactionActive(ctx context.Context, req *dto.TransactionRequest) bool {
	return i.transactions.Active(txKey(ctx, req.ConnectionID, req.Tab))
}
