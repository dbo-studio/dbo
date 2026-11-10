package serviceNoSQL

import (
	"context"
	"errors"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func (s *Service) windower(ctx context.Context, connectionID int32, containerID string) (contract.NoSQLRepository, contract.Windower, error) {
	repo, _, err := s.open(ctx, connectionID)
	if err != nil {
		return nil, nil, err
	}

	if err := s.require(ctx, repo, containerID, contract.CapWindow); err != nil {
		return nil, nil, err
	}

	w, ok := repo.(contract.Windower)
	if !ok {
		return nil, nil, apperror.BadRequest(ErrToolNotSupported)
	}

	return repo, w, nil
}

func (s *Service) Window(ctx context.Context, req *dto.NoSQLWindowRequest) (*contract.MemberWindow, error) {
	_, w, err := s.windower(ctx, req.ConnectionID, req.ContainerID)
	if err != nil {
		return nil, err
	}

	res, err := w.Window(ctx, req.ContainerID, req.ItemID, req.Cursor, req.Limit)
	if err != nil {
		return nil, apperror.BadRequest(err)
	}

	return res, nil
}

func (s *Service) ApplyMember(ctx context.Context, req *dto.NoSQLMemberRequest) error {
	repo, w, err := s.windower(ctx, req.ConnectionID, req.ContainerID)
	if err != nil {
		return err
	}

	if err := s.require(ctx, repo, req.ContainerID, contract.CapEdit); err != nil {
		return err
	}

	switch req.Op.Op {
	case "set", "remove", "append":
	default:
		return apperror.BadRequest(errors.New("op must be set, remove or append"))
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "save", ContainerID: req.ContainerID, Count: 1}, req.Confirmed); err != nil {
		return err
	}

	if err := w.ApplyMember(ctx, req.ContainerID, req.ItemID, req.Op); err != nil {
		return apperror.BadRequest(err)
	}

	return nil
}
