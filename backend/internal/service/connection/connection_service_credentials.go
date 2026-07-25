package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (s IConnectionServiceImpl) SetCredentials(ctx context.Context, connectionID int32, req *dto.ConnectionCredentialsRequest) error {
	connection, err := s.connectionRepo.Find(ctx, connectionID)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	ownerID := helper.CtxOwnerID(ctx)
	if err := s.secrets.SetConnectionPassword(ctx, ownerID, connection.ID, req.Password, req.RememberPassword); err != nil {
		return apperror.InternalServerError(err)
	}

	return nil
}
