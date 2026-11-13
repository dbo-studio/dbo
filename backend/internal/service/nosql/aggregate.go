package serviceNoSQL

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func (s *Service) Aggregate(ctx context.Context, req *dto.NoSQLAggregateRequest) (*contract.AggregateResult, error) {
	repo, _, err := s.open(ctx, req.ConnectionID)
	if err != nil {
		return nil, err
	}

	if err := s.require(ctx, repo, req.ContainerID, contract.CapAggregate); err != nil {
		return nil, err
	}

	a, ok := repo.(contract.Aggregator)
	if !ok {
		return nil, apperror.BadRequest(ErrToolNotSupported)
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "aggregate", ContainerID: req.ContainerID, Raw: req.Pipeline}, true); err != nil {
		return nil, err
	}

	out, err := a.Aggregate(ctx, req.ContainerID, req.Pipeline, req.Limit)
	if err != nil {
		return nil, driverErr(err)
	}

	return out, nil
}
