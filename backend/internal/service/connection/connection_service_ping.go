package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (s IConnectionServiceImpl) Ping(ctx context.Context, req *dto.PingConnectionRequest) error {
	ownerID := helper.CtxOwnerID(ctx)

	if req.ID != nil {
		if _, err := s.connectionRepo.Find(ctx, lo.FromPtr(req.ID)); err != nil {
			return apperror.NotFound(apperror.ErrConnectionNotFound)
		}
	}

	if _, err := s.createConnectionDto(&dto.CreateConnectionRequest{
		Type:    req.Type,
		Options: req.Options,
	}); err != nil {
		return apperror.DriverError(err)
	}

	connection := &model.Connection{
		ConnectionType: req.Type,
		Options:        string(req.Options),
	}

	if _, err := s.cm.GetConnection(ctx, connection, false); err != nil {
		return err
	}
	if err := s.cm.Close(ctx, ownerID, connection.ID); err != nil {
		return err
	}

	return nil
}
