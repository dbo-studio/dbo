package serviceNoSQL

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func (s *Service) Stats(ctx context.Context, req *dto.NoSQLContainerRequest) (*contract.ContainerStats, error) {
	repo, _, err := s.open(ctx, req.ConnectionID)
	if err != nil {
		return nil, err
	}

	if err := s.require(ctx, repo, req.ContainerID, contract.CapStats); err != nil {
		return nil, err
	}

	p, ok := repo.(contract.StatsProvider)
	if !ok {
		return nil, apperror.BadRequest(ErrToolNotSupported)
	}

	stats, err := p.Stats(ctx, req.ContainerID)
	if err != nil {
		return nil, driverErr(err)
	}

	return stats, nil
}
