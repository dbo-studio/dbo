package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
	"github.com/tidwall/sjson"
)

func (s IConnectionServiceImpl) Update(ctx context.Context, connectionId int32, req *dto.UpdateConnectionRequest) error {
	connection, err := s.connectionRepo.Find(ctx, connectionId)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	// Preserve existing options when the request doesn't include them (e.g. toggling active connection).
	if len(req.Options) == 0 {
		req.Options = json.RawMessage(connection.Options)
	}

	if lo.FromPtrOr(req.IsClose, false) {
		if err := s.Close(ctx, connectionId); err != nil {
			return err
		}
	}

	password, strippedOptions, err := extractPasswordAndStrip(req.Options)
	if err != nil {
		return apperror.InternalServerError(err)
	}
	req.Options = strippedOptions

	if password != "" {
		ownerID := helper.CtxOwnerID(ctx)
		remember := req.RememberPassword != nil && *req.RememberPassword
		if err := s.secrets.SetConnectionPassword(ctx, ownerID, connection.ID, password, remember); err != nil {
			return apperror.InternalServerError(err)
		}
	}

	var options string
	switch connection.ConnectionType {
	case string(databaseContract.Postgresql):
		options, err = databaseConnection.UpdatePostgresqlConnection(json.RawMessage(connection.Options), req.Options)
	case string(databaseContract.Sqlite):
		options, err = databaseConnection.UpdateSQLiteConnection(json.RawMessage(connection.Options), req.Options)
	case string(databaseContract.Mysql):
		options, err = databaseConnection.UpdateMysqlConnection(json.RawMessage(connection.Options), req.Options)
	}

	if err != nil {
		return err
	}

	// Ensure password is never persisted in Connection.Options.
	if stripped, stripErr := sjson.Delete(options, "password"); stripErr == nil {
		req.Options = json.RawMessage(stripped)
	} else {
		req.Options = json.RawMessage(options)
	}

	if _, err := s.connectionRepo.Update(ctx, connection, req); err != nil {
		return apperror.InternalServerError(err)
	}

	if lo.FromPtrOr(req.IsActive, false) {
		if err := s.connectionRepo.MakeAllConnectionsNotDefault(ctx, connection); err != nil {
			return apperror.InternalServerError(err)
		}
	}

	return nil
}
