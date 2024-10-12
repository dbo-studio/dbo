package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/app"
	pgsqlDriver "github.com/dbo-studio/dbo/driver/pgsql"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

type IConnectionService interface {
	Connections(ctx context.Context) (*dto.ConnectionsResponse, error)
	CreateConnection(ctx context.Context, req *dto.CreateConnectionRequest) (*dto.ConnectionDetailResponse, error)
	ConnectionDetail(ctx context.Context, req *dto.ConnectionDetailRequest) (*dto.ConnectionDetailResponse, error)
	UpdateConnection(ctx context.Context, connectionId int32, req *dto.UpdateConnectionRequest) (*dto.ConnectionDetailResponse, error)
	DeleteConnection(ctx context.Context, connectionId int32) (*dto.ConnectionsResponse, error)
	TestConnection(ctx context.Context, req *dto.CreateConnectionRequest) error
}

var _ IConnectionService = (*IConnectionServiceImpl)(nil)

type IConnectionServiceImpl struct {
	connectionRepo repository.IConnectionRepo
	cacheRepo      repository.ICacheRepo
}

func NewConnectionService(
	connectionRepo repository.IConnectionRepo,
	cacheRepo repository.ICacheRepo,
) *IConnectionServiceImpl {
	return &IConnectionServiceImpl{
		connectionRepo: connectionRepo,
		cacheRepo:      cacheRepo,
	}
}

func (s IConnectionServiceImpl) Connections(ctx context.Context) (*dto.ConnectionsResponse, error) {
	connections, err := s.connectionRepo.ConnectionList(ctx)
	if err != nil {
		return nil, err
	}

	return connectionsToResponse(connections), nil
}

func (s IConnectionServiceImpl) CreateConnection(ctx context.Context, req *dto.CreateConnectionRequest) (*dto.ConnectionDetailResponse, error) {
	err := s.TestConnection(ctx, req)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	connection, err := s.connectionRepo.CreateConnection(ctx, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	err = s.cacheRepo.FlushCache(ctx)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return s.connectionDetail(ctx, connection, false)
}

func (s IConnectionServiceImpl) DeleteConnection(ctx context.Context, connectionId int32) (*dto.ConnectionsResponse, error) {
	connection, err := s.connectionRepo.FindConnection(ctx, connectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	err = s.connectionRepo.DeleteConnection(ctx, connection)
	if err != nil {
		return nil, err
	}

	err = s.cacheRepo.FlushCache(ctx)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return s.Connections(ctx)
}

func (s IConnectionServiceImpl) TestConnection(_ context.Context, req *dto.CreateConnectionRequest) error {
	_, err := app.Drivers().Pgsql.ConnectWithOptions(pgsqlDriver.ConnectionOption{
		Host:     req.Host,
		Port:     int32(req.Port),
		User:     req.Username,
		Password: req.Password,
		Database: req.Database,
	})

	return err
}
