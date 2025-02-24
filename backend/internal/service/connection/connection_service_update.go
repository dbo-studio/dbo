package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/goccy/go-json"
)

func (s IConnectionServiceImpl) Update(ctx context.Context, connectionId int32, req *dto.UpdateConnectionRequest) (*dto.ConnectionDetailResponse, error) {
	connection, err := s.connectionRepo.Find(ctx, connectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	var options string
	switch connection.ConnectionType {
	case string(databaseContract.Postgresql):
		options, err = databaseConnection.UpdatePostgresqlConnection(json.RawMessage(connection.Options), req.Options)
	}

	if err != nil {
		return nil, err
	}

	req.Options = json.RawMessage(options)

	updatedConnection, err := s.connectionRepo.Update(ctx, connection, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	err = s.connectionRepo.MakeAllConnectionsNotDefault(ctx, connection, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return connectionDetailModelToResponse(updatedConnection), nil
}
