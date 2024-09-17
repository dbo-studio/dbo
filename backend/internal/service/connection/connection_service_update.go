package serviceConnection

import (
	"context"
	"database/sql"

	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/helper"
	"github.com/dbo-studio/dbo/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func (s *IConnectionServiceImpl) UpdateConnection(ctx context.Context, connectionId int32, req *dto.UpdateConnectionRequest) (*dto.ConnectionDetailResponse, error) {
	connection, err := s.connectionRepo.FindConnection(ctx, connectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	updatedConnection, err := updateConnection(connection, req)
	s.cacheRepo.FlushCache(ctx)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	err = makeAllConnectionsNotDefault(connection, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	app.Drivers().Pgsql.Close(int32(connection.ID))

	return s.connectionDetail(ctx, updatedConnection, false)
}

func updateConnection(connection *model.Connection, req *dto.UpdateConnectionRequest) (*model.Connection, error) {
	connection.Name = helper.OptionalString(req.Name, connection.Name)
	connection.Host = helper.OptionalString(req.Host, connection.Host)
	connection.Username = helper.OptionalString(req.Username, connection.Username)
	connection.Password = sql.NullString{
		Valid:  true,
		String: helper.OptionalString(req.Password, connection.Password.String),
	}
	connection.Port = helper.OptionalUint(req.Port, connection.Port)
	connection.Database = helper.OptionalString(req.Database, connection.Database)
	connection.IsActive = helper.OptionalBool(req.IsActive, connection.IsActive)
	connection.CurrentDatabase = sql.NullString{
		Valid:  true,
		String: helper.OptionalString(req.CurrentDatabase, connection.CurrentDatabase.String),
	}

	if req.CurrentDatabase != nil && req.CurrentSchema == nil {
		schemas, _ := app.Drivers().Pgsql.Schemas(int32(connection.ID), *req.CurrentDatabase, false)
		var currentSchema string
		if len(schemas) > 0 {
			currentSchema = schemas[0]
		}
		connection.CurrentSchema = sql.NullString{
			Valid:  true,
			String: currentSchema,
		}
	} else {
		connection.CurrentSchema = sql.NullString{
			Valid:  true,
			String: helper.OptionalString(req.CurrentSchema, connection.CurrentSchema.String),
		}
	}

	result := app.DB().Save(&connection)

	return connection, result.Error
}

func makeAllConnectionsNotDefault(connection *model.Connection, req *dto.UpdateConnectionRequest) error {
	if req.IsActive != nil && *req.IsActive {
		result := app.DB().Model(&model.Connection{}).Not("id", connection.ID).Update("is_active", false)
		return result.Error
	}
	return nil
}
