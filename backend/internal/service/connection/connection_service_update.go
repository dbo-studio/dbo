package serviceConnection

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
	"github.com/tidwall/sjson"
)

func (s IConnectionServiceImpl) Update(ctx context.Context, connectionID int32, req *dto.UpdateConnectionRequest) (*dto.UpdateConnectionResponse, error) {
	connection, err := s.connectionRepo.Find(ctx, connectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	ownerID := helper.CtxOwnerID(ctx)

	optionsProvided := len(req.Options) > 0

	// Preserve existing options when the request doesn't include them (e.g. toggling active connection).
	if !optionsProvided {
		req.Options = json.RawMessage(connection.Options)
	}

	if lo.FromPtrOr(req.IsClose, false) {
		if err := s.Close(ctx, connectionID); err != nil {
			return nil, err
		}
	}

	password, strippedOptions, err := extractPasswordAndStrip(req.Options)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}
	req.Options = strippedOptions

	if password != "" {
		remember := req.RememberPassword != nil && *req.RememberPassword
		if err := s.secrets.SetConnectionPassword(ctx, ownerID, connection.ID, password, remember); err != nil {
			return nil, apperror.InternalServerError(err)
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
		return nil, err
	}

	// Ensure password is never persisted in Connection.Options.
	if stripped, stripErr := sjson.Delete(options, "password"); stripErr == nil {
		req.Options = json.RawMessage(stripped)
	} else {
		req.Options = json.RawMessage(options)
	}

	updatedConnection, err := s.connectionRepo.Update(ctx, connection, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if optionsProvided {
		if s.cm != nil {
			if err := s.cm.Close(ctx, ownerID, connection.ID); err != nil {
				return nil, apperror.InternalServerError(fmt.Errorf("failed to refresh connection pool: %w", err))
			}
		}

		if err := s.cache.DeleteByPrefix(ctx, fmt.Sprintf("c:%d", connection.ID)); err != nil {
			return nil, apperror.InternalServerError(err)
		}
	}

	if lo.FromPtrOr(req.IsActive, false) {
		if err := s.connectionRepo.MakeAllConnectionsNotDefault(ctx, connection); err != nil {
			return nil, apperror.InternalServerError(err)
		}
	}

	return &dto.UpdateConnectionResponse{
		Connection: connectionToResponse(ctx, ownerID, s.cm, updatedConnection),
	}, nil
}
