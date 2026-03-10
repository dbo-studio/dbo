package serviceConnection

import (
	"context"

	"github.com/goccy/go-json"
	"github.com/samber/lo"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (s IConnectionServiceImpl) Create(ctx context.Context, req *dto.CreateConnectionRequest) error {
	err := s.Ping(ctx, req)
	if err != nil {
		return apperror.DriverError(err)
	}

	req, err = s.createConnectionDto(req)
	if err != nil {
		return apperror.DriverError(err)
	}

	password, strippedOptions, err := extractPasswordAndStrip(req.Options)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	req.Options = strippedOptions

	connection, err := s.connectionRepo.Create(ctx, req)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	if password != "" {
		ownerID := helper.CtxOwnerID(ctx)
		remember := lo.FromPtrOr(req.RememberPassword, false)
		if err := s.secrets.SetConnectionPassword(ctx, ownerID, connection.ID, password, remember); err != nil {
			return apperror.InternalServerError(err)
		}
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, s.cm)
	if err != nil {
		return err
	}

	version, err := repo.Version(ctx)

	if err != nil {
		return apperror.InternalServerError(err)
	}

	if _, err = s.connectionRepo.UpdateVersion(ctx, connection, version); err != nil {
		return apperror.InternalServerError(err)
	}

	return nil
}

func (s IConnectionServiceImpl) createConnectionDto(req *dto.CreateConnectionRequest) (*dto.CreateConnectionRequest, error) {
	var options string
	var err error

	switch req.Type {
	case string(databaseContract.Postgresql):
		options, err = databaseConnection.CreatePostgresqlConnection(req.Options)
	case string(databaseContract.Sqlite):
		options, err = databaseConnection.CreateSQLiteConnection(req.Options)
	case string(databaseContract.Mysql):
		options, err = databaseConnection.CreateMysqlConnection(req.Options)
	}

	if err != nil {
		return nil, err
	}

	req.Options = json.RawMessage(options)

	return req, nil
}

func extractPasswordAndStrip(options json.RawMessage) (string, json.RawMessage, error) {
	if len(options) == 0 {
		return "", options, nil
	}

	password := gjson.GetBytes(options, "password").String()
	if password == "" {
		return "", options, nil
	}

	stripped, err := sjson.DeleteBytes(options, "password")
	if err != nil {
		return "", options, err
	}

	return password, stripped, nil
}
