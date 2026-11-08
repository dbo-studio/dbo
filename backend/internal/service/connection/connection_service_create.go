package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

func (s IConnectionServiceImpl) Create(ctx context.Context, req *dto.CreateConnectionRequest) error {
	if err := helper.RequirePermission(ctx, helper.PermCreateConnection); err != nil {
		return err
	}

	_, err := s.Ping(ctx, &dto.PingConnectionRequest{
		ID:      nil,
		Type:    req.Type,
		Options: req.Options,
	})
	if err != nil {
		return err
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

	sm := serviceSafemode.ApplyCreateDefaults(req.SafeMode)
	req.SafeMode = lo.ToPtr(string(sm))

	connection, err := s.connectionRepo.Create(ctx, req)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	// Redis and MongoDB are commonly passwordless; an empty stored secret keeps hydration from asking for one.
	if password != "" || databaseContract.IsRedisFamily(req.Type) || databaseContract.IsMongo(req.Type) {
		ownerID := helper.CtxOwnerID(ctx)

		// An empty Redis password is no secret: keep it so a restart or timeout never asks for one.
		remember := lo.FromPtrOr(req.RememberPassword, false) || password == ""
		if err := s.secrets.SetConnectionPassword(ctx, ownerID, connection.ID, password, remember); err != nil {
			return apperror.InternalServerError(err)
		}
	}

	repo, err := database.NewTreeRepository(ctx, connection, s.cm)
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
	var (
		options string
		err     error
	)

	switch {
	case databaseContract.IsPostgresFamily(req.Type):
		options, err = databaseConnection.CreatePostgresqlConnection(req.Options)
	case req.Type == string(databaseContract.Sqlite):
		options, err = databaseConnection.CreateSQLiteConnection(req.Options)
	case databaseContract.IsMysqlFamily(req.Type), databaseContract.IsHostSQL(req.Type):
		// SQL Server and ClickHouse take the same host/port/user/database/SSL/SSH fields as MySQL.
		options, err = databaseConnection.CreateMysqlConnection(req.Options)
	case databaseContract.IsRedisFamily(req.Type):
		options, err = databaseConnection.CreateRedisConnection(req.Options)
	case databaseContract.IsMongo(req.Type):
		options, err = databaseConnection.CreateMongoConnection(req.Options)
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
	out := options

	if password != "" {
		stripped, err := sjson.DeleteBytes(out, "password")
		if err != nil {
			return "", options, err
		}

		out = stripped
	}

	uri := gjson.GetBytes(out, "uri").String()
	if uri == "" {
		return password, out, nil
	}

	cleaned, uriPassword, err := databaseConnection.StripURIPassword(uri)
	if err != nil {
		return "", options, err
	}

	if uriPassword != "" && password == "" {
		password = uriPassword
	}

	if cleaned != uri {
		updated, setErr := sjson.SetBytes(out, "uri", cleaned)
		if setErr != nil {
			return "", options, setErr
		}

		out = updated
	}

	return password, out, nil
}
