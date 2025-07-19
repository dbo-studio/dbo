package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func (s IConnectionServiceImpl) Delete(ctx context.Context, connectionId int32) (*dto.ConnectionsResponse, error) {
	connection, err := s.connectionRepo.Find(ctx, connectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	err = s.connectionRepo.Delete(ctx, connection)
	if err != nil {
		return nil, err
	}

	return s.Index(ctx)
}
