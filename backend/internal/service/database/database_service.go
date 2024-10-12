package serviceDatabase

import (
	"context"

	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

type IDatabaseService interface {
	CreateDatabase(context.Context, *dto.CreateDatabaseRequest) error
	DeleteDatabase(context.Context, *dto.DeleteDatabaseRequest) error
	MetaData(ctx context.Context, connId int32) (*dto.DatabaseMetaDataResponse, error)
}

var _ IDatabaseService = (*IDatabaseServiceImpl)(nil)

type IDatabaseServiceImpl struct {
	connectionRepo repository.IConnectionRepo
}

func NewDatabaseService(cr repository.IConnectionRepo) *IDatabaseServiceImpl {
	return &IDatabaseServiceImpl{
		connectionRepo: cr,
	}
}

func (i IDatabaseServiceImpl) CreateDatabase(ctx context.Context, dto *dto.CreateDatabaseRequest) error {
	_, err := i.connectionRepo.FindConnection(ctx, dto.ConnectionId)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	err = app.Drivers().Pgsql.CreateDatabase(dto)
	if err != nil {
		return apperror.DriverError(apperror.ErrConnectionNotFound)
	}

	return err
}

func (i IDatabaseServiceImpl) DeleteDatabase(ctx context.Context, dto *dto.DeleteDatabaseRequest) error {
	_, err := i.connectionRepo.FindConnection(ctx, dto.ConnectionId)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	err = app.Drivers().Pgsql.DropDatabase(dto)
	if err != nil {
		return apperror.DriverError(err)
	}

	return err
}

func (i IDatabaseServiceImpl) MetaData(ctx context.Context, connId int32) (*dto.DatabaseMetaDataResponse, error) {
	connection, err := i.connectionRepo.FindConnection(ctx, connId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	databases, err := app.Drivers().Pgsql.Databases(int32(connection.ID), true)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	tableSpaces, err := app.Drivers().Pgsql.TableSpaces(int32(connection.ID))
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	encodings := app.Drivers().Pgsql.Encodes()
	datatypes := app.Drivers().Pgsql.DataTypes()

	return &dto.DatabaseMetaDataResponse{
		Templates:   databases,
		Tablespaces: tableSpaces,
		Encodings:   encodings,
		DataTypes:   datatypes,
	}, nil
}
