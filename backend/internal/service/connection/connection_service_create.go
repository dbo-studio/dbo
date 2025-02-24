package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/goccy/go-json"
)

func (s IConnectionServiceImpl) Create(ctx context.Context, req *dto.CreateConnectionRequest) (*dto.ConnectionDetailResponse, error) {
	err := s.Test(ctx, req)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	var options string
	switch req.Type {
	case string(databaseContract.Postgresql):
		options, err = databaseConnection.CreatePostgresqlConnection(req.Options)
	case string(databaseContract.Sqlite):
		options, err = databaseConnection.CreateSQLiteConnection(req.Options)
	}

	if err != nil {
		return nil, err
	}

	req.Options = json.RawMessage(options)

	connection, err := s.connectionRepo.Create(ctx, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return connectionDetailModelToResponse(connection), nil
}
