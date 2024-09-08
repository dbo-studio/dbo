package service

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

var _ IConnectionService = (*IConnectionServiceImpl)(nil)

type IConnectionServiceImpl struct {
	connectionRepo repository.IConnectionRepo
}

func NewConnectionService(
	connectionRepo repository.IConnectionRepo,
) *IConnectionServiceImpl {
	return &IConnectionServiceImpl{
		connectionRepo: connectionRepo,
	}
}

func (s *IConnectionServiceImpl) Connections(ctx context.Context) (*[]dto.ConnectionsResponse, error) {
	connections, err := s.connectionRepo.ConnectionList(ctx)
	if err != nil {
		return nil, err
	}

	return connectionsToResponse(connections), nil
}

func (s *IConnectionServiceImpl) CreateConnection(ctx context.Context, req *dto.CreateConnectionRequest) (*dto.ConnectionDetailResponse, error) {
	connection, err := s.connectionRepo.CreateConnection(ctx, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return connectionDetail(connection, false)
}

func (s *IConnectionServiceImpl) ConnectionDetail(ctx context.Context, req *dto.ConnectionDetailRequest) (*dto.ConnectionDetailResponse, error) {
	connection, err := s.connectionRepo.FindConnection(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	return connectionDetail(connection, req.FromCache)
}

func (s *IConnectionServiceImpl) DeleteConnection(ctx context.Context, connectionId int32) (*[]dto.ConnectionsResponse, error) {
	connection, err := s.connectionRepo.FindConnection(ctx, connectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	err = s.connectionRepo.DeleteConnection(ctx, connection)
	if err != nil {
		return nil, err
	}

	return s.Connections(ctx)
}

func connectionDetail(connection *model.Connection, fromCache bool) (*dto.ConnectionDetailResponse, error) {
	var schemas = make([]string, 0)
	var tables = make([]string, 0)
	var err error

	databases, err := getDatabases(connection.ID, fromCache)
	if err != nil {
		app.Log().Error(err.Error())
		return nil, err
	}

	version, err := getVersion(connection.ID, fromCache)
	if err != nil {
		return nil, err
	}

	if connection.CurrentDatabase.String == "" {
		return nil, err
	}

	schemas, err = getSchemas(connection.ID, connection.CurrentDatabase.String, fromCache)
	if err != nil {
		app.Log().Error(err.Error())
		return nil, err
	}

	currentSchema := connection.CurrentSchema.String

	if connection.CurrentSchema.String == "" && len(schemas) > 0 {
		currentSchema = schemas[0]
	}

	if currentSchema != "" {
		tables, err = getTables(connection.ID, currentSchema, fromCache)
		if err != nil {
			return nil, err
		}
	}

	app.DB().Model(&connection).Updates(&model.Connection{
		CurrentSchema: sql.NullString{
			String: currentSchema,
			Valid:  true,
		},
		IsActive: true,
	})

	return connectionDetailModelToResponse(connection, version, databases, schemas, tables), nil
}

func getDatabases(connectionID uint, fromCache bool) ([]string, error) {
	var databases []string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("databases_%d", connectionID),
		&databases,
		fromCache,
	)

	if err != nil || databases == nil {
		databases, err = app.Drivers().Pgsql.Databases(int32(connectionID), false)

		if err != nil {
			return databases, err
		}

		err = app.Cache().Set(fmt.Sprintf("databases_%d", connectionID), databases, nil)
		if err != nil {
			return databases, err
		}
	}

	return databases, err
}

func getVersion(connectionID uint, fromCache bool) (string, error) {
	var version string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("version_%d", connectionID),
		&version,
		fromCache,
	)

	if err != nil || version == "" {
		version, err = app.Drivers().Pgsql.Version(int32(connectionID))

		if err != nil {
			return version, err
		}

		err = app.Cache().Set(fmt.Sprintf("version_%d", connectionID), version, nil)
		if err != nil {
			return version, err
		}
	}

	return version, err
}

func getSchemas(connectionID uint, databaseName string, fromCache bool) ([]string, error) {
	var schemas []string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("schemas_%d", connectionID),
		&schemas,
		fromCache,
	)

	if err != nil || schemas == nil {
		schemas, err = app.Drivers().Pgsql.Schemas(int32(connectionID), databaseName, false)

		if err != nil {
			return schemas, err
		}

		err = app.Cache().Set(fmt.Sprintf("schemas_%d", connectionID), schemas, nil)
		if err != nil {
			return schemas, err
		}
	}

	return schemas, err
}

func getTables(connectionID uint, schemaName string, fromCache bool) ([]string, error) {
	var tables []string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("tables_%d", connectionID),
		&tables,
		fromCache,
	)

	if err != nil || tables == nil {
		tables, err = app.Drivers().Pgsql.Tables(int32(connectionID), schemaName)

		if err != nil {
			return tables, err
		}

		err = app.Cache().Set(fmt.Sprintf("tables_%d", connectionID), tables, nil)
		if err != nil {
			return tables, err
		}
	}

	return tables, err
}
