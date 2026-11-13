package serviceNoSQL

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func (s *Service) schema(ctx context.Context, connectionID int32, containerID string) (contract.NoSQLRepository, contract.SchemaTools, error) {
	repo, _, err := s.open(ctx, connectionID)
	if err != nil {
		return nil, nil, err
	}

	if err := s.require(ctx, repo, containerID, contract.CapSchema); err != nil {
		return nil, nil, err
	}

	t, ok := repo.(contract.SchemaTools)
	if !ok {
		return nil, nil, apperror.BadRequest(ErrToolNotSupported)
	}

	return repo, t, nil
}

func (s *Service) Schema(ctx context.Context, req *dto.NoSQLSchemaRequest) (*contract.SchemaAnalysis, error) {
	repo, t, err := s.schema(ctx, req.ConnectionID, req.ContainerID)
	if err != nil {
		return nil, err
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "analyze", ContainerID: req.ContainerID}, true); err != nil {
		return nil, err
	}

	out, err := t.Analyze(ctx, req.ContainerID, req.Sample)
	if err != nil {
		return nil, driverErr(err)
	}

	return out, nil
}

func (s *Service) GetValidator(ctx context.Context, req *dto.NoSQLContainerRequest) (*contract.Validator, error) {
	_, t, err := s.schema(ctx, req.ConnectionID, req.ContainerID)
	if err != nil {
		return nil, err
	}

	out, err := t.GetValidator(ctx, req.ContainerID)
	if err != nil {
		return nil, driverErr(err)
	}

	return out, nil
}

func (s *Service) SetValidator(ctx context.Context, req *dto.NoSQLValidatorRequest) error {
	repo, t, err := s.schema(ctx, req.ConnectionID, req.ContainerID)
	if err != nil {
		return err
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "validator-set", ContainerID: req.ContainerID, Count: 1}, req.Confirmed); err != nil {
		return err
	}

	if err := t.SetValidator(ctx, req.ContainerID, req.Validator); err != nil {
		return driverErr(err)
	}

	return nil
}
