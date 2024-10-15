package serviceConnection

import (
	"context"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/contract"
	"github.com/dbo-studio/dbo/internal/driver"
	"github.com/dbo-studio/dbo/internal/driver/pgsql/engine"

	"github.com/dbo-studio/dbo/pkg/apperror"
)

var _ contract.IConnectionService = (*IConnectionServiceImpl)(nil)

type IConnectionServiceImpl struct {
	drivers        *driver.DriverEngine
	connectionRepo contract.IConnectionRepo
	cacheRepo      contract.ICacheRepo
}

func NewConnectionService(
	drivers *driver.DriverEngine,
	connectionRepo contract.IConnectionRepo,
	cacheRepo contract.ICacheRepo,
) *IConnectionServiceImpl {
	return &IConnectionServiceImpl{
		drivers:        drivers,
		connectionRepo: connectionRepo,
		cacheRepo:      cacheRepo,
	}
}

func (s IConnectionServiceImpl) Index(ctx context.Context) (*dto.ConnectionsResponse, error) {
	connections, err := s.connectionRepo.Index(ctx)
	if err != nil {
		return nil, err
	}

	return connectionsToResponse(connections), nil
}

func (s IConnectionServiceImpl) Create(ctx context.Context, req *dto.CreateConnectionRequest) (*dto.ConnectionDetailResponse, error) {
	err := s.Test(ctx, req)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	connection, err := s.connectionRepo.Create(ctx, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	err = s.cacheRepo.FlushCache(ctx)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return s.connectionDetail(ctx, connection, false)
}

func (s IConnectionServiceImpl) Delete(ctx context.Context, connectionId int32) (*dto.ConnectionsResponse, error) {
	connection, err := s.connectionRepo.Find(ctx, connectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	err = s.connectionRepo.Delete(ctx, connection)
	if err != nil {
		return nil, err
	}

	err = s.cacheRepo.FlushCache(ctx)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return s.Index(ctx)
}

func (s IConnectionServiceImpl) Test(_ context.Context, req *dto.CreateConnectionRequest) error {
	_, err := s.drivers.Pgsql.ConnectWithOptions(engine.ConnectionOption{
		Host:     req.Host,
		Port:     int32(req.Port),
		User:     req.Username,
		Password: req.Password,
		Database: req.Database,
	})

	return err
}
