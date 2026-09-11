package serviceConnection

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

func (s IConnectionServiceImpl) Update(ctx context.Context, connectionID int32, req *dto.UpdateConnectionRequest) (*dto.UpdateConnectionResponse, error) {
	connection, err := s.connectionRepo.Find(ctx, connectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	access := s.resolveAccess(ctx, connection)
	ownerID := helper.CtxOwnerID(ctx)

	optionsProvided := len(req.Options) > 0
	metadataEdit := optionsProvided || req.Name != nil || req.SafeMode != nil

	if metadataEdit && !access.canEdit() {
		return nil, apperror.Forbidden(apperror.ErrConnectionEditForbidden)
	}

	if lo.FromPtrOr(req.IsClose, false) {
		if err := s.Close(ctx, connectionID); err != nil {
			return nil, err
		}
	}

	if !metadataEdit {
		if access.isOwner() && req.IsActive != nil {
			req.Options = json.RawMessage(connection.Options)

			updatedConnection, err := s.connectionRepo.Update(ctx, connection, req)
			if err != nil {
				return nil, apperror.InternalServerError(err)
			}

			if lo.FromPtrOr(req.IsActive, false) {
				if err := s.connectionRepo.MakeAllConnectionsNotDefault(ctx, connection); err != nil {
					return nil, apperror.InternalServerError(err)
				}
			}

			return &dto.UpdateConnectionResponse{
				Connection: s.toConnectionResponse(ctx, updatedConnection),
			}, nil
		}

		return &dto.UpdateConnectionResponse{
			Connection: s.toConnectionResponse(ctx, connection),
		}, nil
	}

	oldUsername := gjson.Get(connection.Options, "username").String()

	if !optionsProvided {
		req.Options = json.RawMessage(connection.Options)
	}

	password, strippedOptions, err := extractPasswordAndStrip(req.Options)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	req.Options = strippedOptions

	if password != "" {
		optionsForPing, setErr := sjson.SetBytes(req.Options, "password", password)
		if setErr != nil {
			return nil, apperror.InternalServerError(setErr)
		}

		if _, err := s.Ping(ctx, &dto.PingConnectionRequest{
			ID:      lo.ToPtr(connectionID),
			Type:    connection.ConnectionType,
			Options: optionsForPing,
		}); err != nil {
			return nil, err
		}

		remember := req.RememberPassword != nil && *req.RememberPassword
		if err := s.secrets.SetConnectionPassword(ctx, ownerID, connection.ID, password, remember); err != nil {
			return nil, apperror.InternalServerError(err)
		}

		if remember && access.isOwner() {
			if has, err := s.secrets.HasSharedConnectionPassword(ctx, connection.ID); err == nil && has {
				if err := s.secrets.SetSharedConnectionPassword(ctx, connection.ID, password); err != nil {
					return nil, apperror.InternalServerError(err)
				}
			}
		}
	}

	var options string

	switch {
	case databaseContract.IsPostgresFamily(connection.ConnectionType):
		options, err = databaseConnection.UpdatePostgresqlConnection(json.RawMessage(connection.Options), req.Options)
	case connection.ConnectionType == string(databaseContract.Sqlite):
		options, err = databaseConnection.UpdateSQLiteConnection(json.RawMessage(connection.Options), req.Options)
	case databaseContract.IsMysqlFamily(connection.ConnectionType):
		options, err = databaseConnection.UpdateMysqlConnection(json.RawMessage(connection.Options), req.Options)
	}

	if err != nil {
		return nil, err
	}

	// Ensure password is never persisted in Connection.Options (field or URI).
	if stripped, stripErr := sjson.Delete(options, "password"); stripErr == nil {
		options = stripped
	}

	if uri := gjson.Get(options, "uri").String(); uri != "" {
		if cleaned, _, uriErr := databaseConnection.StripURIPassword(uri); uriErr == nil && cleaned != uri {
			if rewritten, setErr := sjson.Set(options, "uri", cleaned); setErr == nil {
				options = rewritten
			}
		}
	}

	req.Options = json.RawMessage(options)

	if req.SafeMode != nil {
		normalizedMode := serviceSafemode.NormalizeMode(*req.SafeMode)
		req.SafeMode = lo.ToPtr(string(normalizedMode))

		currentMode := serviceSafemode.NormalizeMode(string(connection.SafeMode))
		if err := s.enforceSafeModeChange(ctx, currentMode, normalizedMode, lo.FromPtr(req.SafeModePassword)); err != nil {
			return nil, err
		}
	}

	updatedConnection, err := s.connectionRepo.Update(ctx, connection, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	newUsername := gjson.Get(string(req.Options), "username").String()
	if optionsProvided && oldUsername != "" && newUsername != "" && oldUsername != newUsername {
		if err := s.secrets.DeleteSharedConnectionPassword(ctx, connection.ID); err != nil {
			return nil, apperror.InternalServerError(err)
		}
	}

	if optionsProvided {
		if err := s.closePoolsForConnection(ctx, connection); err != nil {
			return nil, apperror.InternalServerError(fmt.Errorf("failed to refresh connection pool: %w", err))
		}

		if err := s.cache.DeleteByPrefix(ctx, cache.ConnectionPrefix(connection.ID)); err != nil {
			return nil, apperror.InternalServerError(err)
		}
	}

	if lo.FromPtrOr(req.IsActive, false) && access.isOwner() {
		if err := s.connectionRepo.MakeAllConnectionsNotDefault(ctx, connection); err != nil {
			return nil, apperror.InternalServerError(err)
		}
	}

	return &dto.UpdateConnectionResponse{
		Connection: s.toConnectionResponse(ctx, updatedConnection),
	}, nil
}

func (s IConnectionServiceImpl) enforceSafeModeChange(
	ctx context.Context,
	currentMode model.SafeMode,
	nextMode model.SafeMode,
	password string,
) error {
	if currentMode == nextMode {
		return nil
	}

	if nextMode != model.SafeModeSilent {
		configured, err := s.safeModePassword.Configured(ctx)
		if err != nil {
			return apperror.InternalServerError(err)
		}

		if !configured {
			return apperror.BadRequest(apperror.ErrSafeModePasswordNotFound)
		}

		return nil
	}

	configured, err := s.safeModePassword.Configured(ctx)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	if !configured {
		return nil
	}

	return s.safeModePassword.Check(ctx, password)
}
