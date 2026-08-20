package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
	"github.com/tidwall/sjson"
)

func (s IConnectionServiceImpl) SetCredentials(ctx context.Context, connectionID int32, req *dto.ConnectionCredentialsRequest) error {
	connection, err := s.connectionRepo.Find(ctx, connectionID)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	optionsWithPassword, err := sjson.Set(connection.Options, "password", req.Password)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	if _, err := s.Ping(ctx, &dto.PingConnectionRequest{
		ID:      lo.ToPtr(connectionID),
		Type:    connection.ConnectionType,
		Options: json.RawMessage(optionsWithPassword),
	}); err != nil {
		return err
	}

	ownerID := helper.CtxOwnerID(ctx)
	if err := s.secrets.SetConnectionPassword(ctx, ownerID, connection.ID, req.Password, req.RememberPassword); err != nil {
		return apperror.InternalServerError(err)
	}

	return nil
}
