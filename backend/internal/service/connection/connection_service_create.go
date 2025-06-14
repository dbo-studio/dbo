package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/goccy/go-json"
)

func (s IConnectionServiceImpl) Create(ctx context.Context, req *dto.CreateConnectionRequest) (*dto.ConnectionDetailResponse, error) {
	err := s.Ping(ctx, req)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	req, err = s.createConnectionDto(req)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	connection, err := s.connectionRepo.Create(ctx, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	repo, err := database.NewDatabaseRepository(connection, s.cm)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	version, err := repo.Version()

	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	connection, err = s.connectionRepo.UpdateVersion(ctx, connection, version)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return connectionDetailModelToResponse(connection), nil
}

func (s IConnectionServiceImpl) createConnectionDto(req *dto.CreateConnectionRequest) (*dto.CreateConnectionRequest, error) {
	var options string
	var err error

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

	return req, nil
}
