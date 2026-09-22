package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func (s IConnectionServiceImpl) Delete(ctx context.Context, connectionID int32) (*dto.ConnectionsResponse, error) {
	connection, err := s.connectionRepo.FindByID(ctx, connectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	access := s.resolveAccess(ctx, connection)
	if !access.canDelete() {
		if access.canUse() {
			return nil, apperror.Forbidden(apperror.ErrConnectionDeleteForbidden)
		}

		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	if err := s.closePoolsForConnection(ctx, connection); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if err := s.shareRepo.DeleteByConnection(ctx, connection.ID); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if err := s.secrets.DeleteSharedConnectionPassword(ctx, connection.ID); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if err := s.secrets.DeleteAllConnectionPasswords(ctx, connection.ID); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if err := s.connectionRepo.Delete(ctx, connection); err != nil {
		return nil, err
	}

	return s.Index(ctx)
}
