package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func (s IConnectionServiceImpl) Ping(ctx context.Context, req *dto.CreateConnectionRequest) error {
	req, err := s.createConnectionDto(req)
	if err != nil {
		return apperror.DriverError(err)
	}

	connection := &model.Connection{
		Name:           req.Name,
		ConnectionType: req.Type,
		Options:        string(req.Options),
	}

	_, err = s.cm.GetConnection(ctx, connection)

	return err
}
