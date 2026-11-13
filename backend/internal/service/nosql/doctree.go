package serviceNoSQL

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func (s *Service) docTree(ctx context.Context, connectionID int32, containerID string) (contract.NoSQLRepository, contract.DocTree, error) {
	repo, _, err := s.open(ctx, connectionID)
	if err != nil {
		return nil, nil, err
	}

	if err := s.require(ctx, repo, containerID, contract.CapDocTree); err != nil {
		return nil, nil, err
	}

	t, ok := repo.(contract.DocTree)
	if !ok {
		return nil, nil, apperror.BadRequest(ErrToolNotSupported)
	}

	return repo, t, nil
}

func (s *Service) DocChildren(ctx context.Context, req *dto.NoSQLDocChildrenRequest) (*contract.DocChildren, error) {
	_, t, err := s.docTree(ctx, req.ConnectionID, req.ContainerID)
	if err != nil {
		return nil, err
	}

	out, err := t.Children(ctx, req.ContainerID, req.ItemID, req.Path, req.Offset, req.Limit)
	if err != nil {
		return nil, driverErr(err)
	}

	return out, nil
}

func (s *Service) DocSetField(ctx context.Context, req *dto.NoSQLDocFieldRequest) error {
	repo, t, err := s.docTree(ctx, req.ConnectionID, req.ContainerID)
	if err != nil {
		return err
	}

	if err := s.require(ctx, repo, req.ContainerID, contract.CapEdit); err != nil {
		return err
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "save", ContainerID: req.ContainerID, Count: 1}, req.Confirmed); err != nil {
		return err
	}

	if err := t.SetField(ctx, req.ContainerID, req.ItemID, req.Path, req.Value, req.TypeHint); err != nil {
		return driverErr(err)
	}

	return nil
}

func (s *Service) DocUnsetField(ctx context.Context, req *dto.NoSQLDocFieldRequest) error {
	repo, t, err := s.docTree(ctx, req.ConnectionID, req.ContainerID)
	if err != nil {
		return err
	}

	if err := s.require(ctx, repo, req.ContainerID, contract.CapEdit); err != nil {
		return err
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "save", ContainerID: req.ContainerID, Count: 1}, req.Confirmed); err != nil {
		return err
	}

	if err := t.UnsetField(ctx, req.ContainerID, req.ItemID, req.Path); err != nil {
		return driverErr(err)
	}

	return nil
}
