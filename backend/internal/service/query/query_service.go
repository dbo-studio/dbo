package serviceQuery

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

type IQueryService interface {
	Run(ctx context.Context, req *dto.RunQueryRequest) (*dto.RunQueryResponse, error)
	Raw(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error)
}

var _ IQueryService = (*IQueryServiceImpl)(nil)

type IQueryServiceImpl struct {
	connectionRepo repository.IConnectionRepo
	cm             *databaseConnection.ConnectionManager
}

func NewQueryService(connectionRepo repository.IConnectionRepo, cm *databaseConnection.ConnectionManager) IQueryService {
	return &IQueryServiceImpl{connectionRepo, cm}
}

func (i IQueryServiceImpl) Run(ctx context.Context, req *dto.RunQueryRequest) (*dto.RunQueryResponse, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(connection, i.cm)
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

	repo, err := database.NewDatabaseRepository(connection, i.cm)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return repo.RunRawQuery(req)
}
