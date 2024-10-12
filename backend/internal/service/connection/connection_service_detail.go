package serviceConnection

import (
	"context"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/samber/lo"

	"github.com/dbo-studio/dbo/pkg/apperror"
)

func (s IConnectionServiceImpl) ConnectionDetail(ctx context.Context, req *dto.ConnectionDetailRequest) (*dto.ConnectionDetailResponse, error) {
	connection, err := s.connectionRepo.FindConnection(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	return s.connectionDetail(ctx, connection, req.FromCache)
}

func (s IConnectionServiceImpl) connectionDetail(ctx context.Context, connection *model.Connection, fromCache bool) (*dto.ConnectionDetailResponse, error) {
	var schemas = make([]string, 0)
	var tables = make([]string, 0)
	var err error

	databases, err := s.cacheRepo.GetConnectionDatabases(ctx, connection.ID, fromCache)
	if err != nil {
		return nil, err
	}

	version, err := s.cacheRepo.GetDatabaseVersion(ctx, connection.ID, fromCache)
	if err != nil {
		return nil, err
	}

	if connection.CurrentDatabase.String == "" {
		return connectionDetailModelToResponse(connection, version, databases, schemas, tables), nil
	}

	schemas, err = s.cacheRepo.GetConnectionSchemas(ctx, connection.ID, connection.CurrentDatabase.String, fromCache)
	if err != nil {
		return nil, err
	}

	currentSchema := connection.CurrentSchema.String

	if connection.CurrentSchema.String == "" && len(schemas) > 0 {
		currentSchema = schemas[0]
	}

	if currentSchema != "" {
		tables, err = s.cacheRepo.GeDatabaseTables(ctx, connection.ID, currentSchema, fromCache)
		if err != nil {
			return nil, err
		}
	}

	c, err := s.connectionRepo.UpdateConnection(ctx, connection, &dto.UpdateConnectionRequest{
		CurrentSchema: lo.ToPtr[string](currentSchema),
		IsActive:      lo.ToPtr[bool](true),
	})

	if err != nil {
		return nil, err
	}

	return connectionDetailModelToResponse(c, version, databases, schemas, tables), nil

}
