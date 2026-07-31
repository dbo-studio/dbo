package serviceConnection

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (s IConnectionServiceImpl) Close(ctx context.Context, connectionID int32) error {
	connection, err := s.connectionRepo.Find(ctx, connectionID)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	ownerID := helper.CtxOwnerID(ctx)
	if s.cm != nil {
		if err := s.cm.Close(ctx, ownerID, connection.ID); err != nil {
			return apperror.InternalServerError(fmt.Errorf("failed to close connection: %w", err))
		}
	}

	// Clear temporary secret on manual close. Missing secret is not an error.
	if s.secrets != nil {
		temporary, err := s.secrets.IsTemporaryConnectionPassword(ctx, ownerID, connection.ID)
		if err != nil {
			if !apperror.Equals(err, apperror.ErrPasswordRequired) {
				return err
			}
		} else if temporary {
			if err := s.secrets.DeleteConnectionPassword(ctx, ownerID, connection.ID); err != nil {
				return err
			}
		}
	}

	return s.cache.DeleteByPrefix(ctx, cache.ConnectionPrefix(connection.ID))
}
