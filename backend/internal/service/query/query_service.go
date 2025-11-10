package serviceQuery

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/samber/lo"
)

type IQueryService interface {
	Run(ctx context.Context, req *dto.RunQueryRequest) (*dto.RunQueryResponse, error)
	Raw(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error)
	Update(ctx context.Context, req *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error)
	AutoComplete(ctx context.Context, req *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error)
}

var _ IQueryService = (*IQueryServiceImpl)(nil)

type IQueryServiceImpl struct {
	historyRepo    repository.IHistoryRepo
	connectionRepo repository.IConnectionRepo
	cm             *databaseConnection.ConnectionManager
	cache          cache.Cache
}

func NewQueryService(connectionRepo repository.IConnectionRepo, historyRepo repository.IHistoryRepo, cm *databaseConnection.ConnectionManager, cache cache.Cache) IQueryService {
	return &IQueryServiceImpl{historyRepo, connectionRepo, cm, cache}
}

func (i IQueryServiceImpl) Run(ctx context.Context, req *dto.RunQueryRequest) (*dto.RunQueryResponse, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm, i.cache)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return repo.RunQuery(req)
}

func (i IQueryServiceImpl) Raw(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm, i.cache)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	err = i.historyRepo.Create(ctx, connection.ID, req.Query)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return repo.RunRawQuery(req)
}

func (i IQueryServiceImpl) Update(ctx context.Context, req *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm, i.cache)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return repo.UpdateQuery(req)
}

func (i IQueryServiceImpl) AutoComplete(ctx context.Context, req *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm, i.cache)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	resultFromCache, err := i.findResultFromCache(req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if resultFromCache != nil {
		return resultFromCache, nil
	}

	autocomplete, err := repo.AutoComplete(req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	ttl := 60 * time.Minute
	err = i.cache.Set(i.cacheName(req), autocomplete, &ttl)
	if err != nil {
		return nil, err
	}

	return autocomplete, nil
}

func (i IQueryServiceImpl) findResultFromCache(req *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	var result *dto.AutoCompleteResponse
	err := i.cache.ConditionalGet(
		i.cacheName(req),
		&result,
		true,
	)

	if err != nil {
		return nil, err
	}

	return result, nil
}

func (i IQueryServiceImpl) cacheName(req *dto.AutoCompleteRequest) string {
	return fmt.Sprintf("auto_complete:connection_%d_database_%s_schema_%s", req.ConnectionId, lo.FromPtr(req.Database), lo.FromPtr(req.Schema))
}
