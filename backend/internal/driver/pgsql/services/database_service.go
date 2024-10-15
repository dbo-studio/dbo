package services

import (
	"context"
	c "github.com/dbo-studio/dbo/internal/contract"
	"github.com/dbo-studio/dbo/internal/driver"
	"github.com/dbo-studio/dbo/internal/driver/pgsql/contract"
	"github.com/dbo-studio/dbo/internal/driver/pgsql/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

var _ contract.IDatabaseService = (*IDatabaseServiceImpl)(nil)

type IDatabaseServiceImpl struct {
	drivers        *driver.DriverEngine
	connectionRepo c.IConnectionRepo
}

func NewDatabaseService(cr c.IConnectionRepo, drivers *driver.DriverEngine) *IDatabaseServiceImpl {
	return &IDatabaseServiceImpl{
		connectionRepo: cr,
		drivers:        drivers,
	}
}

func (I IDatabaseServiceImpl) Index(ctx context.Context, request *dto.GetDatabaseListRequest) (*dto.GetDatabaseListResponse, error) {
	connection, err := I.connectionRepo.Find(ctx, request.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	databases, err := I.drivers.Pgsql.Databases(int32(connection.ID), true)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	return &dto.GetDatabaseListResponse{
		Name: databases,
	}, nil
}
