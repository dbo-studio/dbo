package serviceConnection

import (
	"context"

	"github.com/samber/lo"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (s IConnectionServiceImpl) Ping(ctx context.Context, req *dto.PingConnectionRequest) error {
	connection := &model.Connection{
		ConnectionType: req.Type,
		Options:        string(req.Options),
	}

	ownerID := helper.CtxOwnerID(ctx)

	if req.ID != nil {
		cc, err := s.connectionRepo.Find(ctx, lo.FromPtr(req.ID))
		if err != nil {
			return err
		}

		connection = cc
	}

	_, err := s.createConnectionDto(&dto.CreateConnectionRequest{
		Type:    req.Type,
		Options: req.Options,
	})

	if err != nil {
		return apperror.DriverError(err)
	}

	connection.Options = string(req.Options)

	if _, err = s.cm.GetConnection(ctx, connection, false); err != nil {
		return err
	}

	if err := s.cm.Close(ctx, ownerID, connection.ID); err != nil {
		return err
	}

	return nil
}
