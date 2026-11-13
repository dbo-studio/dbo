package serviceNoSQL

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func (s *Service) indexes(ctx context.Context, connectionID int32, containerID string) (contract.NoSQLRepository, contract.IndexManager, error) {
	repo, _, err := s.open(ctx, connectionID)
	if err != nil {
		return nil, nil, err
	}

	if err := s.require(ctx, repo, containerID, contract.CapIndexes); err != nil {
		return nil, nil, err
	}

	m, ok := repo.(contract.IndexManager)
	if !ok {
		return nil, nil, apperror.BadRequest(ErrToolNotSupported)
	}

	return repo, m, nil
}

func (s *Service) Indexes(ctx context.Context, req *dto.NoSQLContainerRequest) ([]contract.IndexDetail, error) {
	_, m, err := s.indexes(ctx, req.ConnectionID, req.ContainerID)
	if err != nil {
		return nil, err
	}

	out, err := m.Indexes(ctx, req.ContainerID)
	if err != nil {
		return nil, driverErr(err)
	}

	return out, nil
}

func (s *Service) IndexCreate(ctx context.Context, req *dto.NoSQLIndexCreateRequest) (string, error) {
	repo, m, err := s.indexes(ctx, req.ConnectionID, req.ContainerID)
	if err != nil {
		return "", err
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "index-create", ContainerID: req.ContainerID, Count: 1}, req.Confirmed); err != nil {
		return "", err
	}

	name, err := m.CreateIndex(ctx, req.ContainerID, req.Spec)
	if err != nil {
		return "", driverErr(err)
	}

	return name, nil
}

func (s *Service) IndexDrop(ctx context.Context, req *dto.NoSQLIndexDropRequest) error {
	repo, m, err := s.indexes(ctx, req.ConnectionID, req.ContainerID)
	if err != nil {
		return err
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "index-drop", ContainerID: req.ContainerID, Count: 1}, req.Confirmed); err != nil {
		return err
	}

	if err := m.DropIndex(ctx, req.ContainerID, req.Name); err != nil {
		return driverErr(err)
	}

	return nil
}

func (s *Service) Explain(ctx context.Context, req *dto.NoSQLBrowseRequest) (*contract.ExplainResult, error) {
	repo, m, err := s.indexes(ctx, req.ConnectionID, req.ContainerID)
	if err != nil {
		return nil, err
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "explain", ContainerID: req.ContainerID, Raw: req.Query.Filter}, true); err != nil {
		return nil, err
	}

	out, err := m.Explain(ctx, req.ContainerID, req.Query)
	if err != nil {
		return nil, driverErr(err)
	}

	return out, nil
}
