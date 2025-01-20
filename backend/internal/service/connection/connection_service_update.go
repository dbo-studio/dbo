package serviceConnection

import (
	"context"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func (s IConnectionServiceImpl) Update(ctx context.Context, connectionId int32, req *dto.UpdateConnectionRequest) (*dto.ConnectionDetailResponse, error) {
	connection, err := s.connectionRepo.Find(ctx, connectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	updatedConnection, err := s.connectionRepo.Update(ctx, connection, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	err = s.cacheRepo.FlushCache(ctx)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	err = s.connectionRepo.MakeAllConnectionsNotDefault(ctx, connection, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	s.drivers.Pgsql.Close(int32(connection.ID))

	return s.connectionDetail(ctx, updatedConnection, false)
}
