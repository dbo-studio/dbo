package serviceNoSQL

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (s *Service) ExportOpen(ctx context.Context, req *dto.NoSQLExportRequest) (contract.ExportIter, error) {
	repo, _, err := s.open(ctx, req.ConnectionID)
	if err != nil {
		return nil, err
	}

	if err := s.require(ctx, repo, req.ContainerID, contract.CapTransfer); err != nil {
		return nil, err
	}

	t, ok := repo.(contract.DataTransfer)
	if !ok {
		return nil, apperror.BadRequest(ErrToolNotSupported)
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "export", ContainerID: req.ContainerID, Raw: req.Filter}, true); err != nil {
		return nil, err
	}

	it, err := t.Export(ctx, req.ContainerID, req.Filter)
	if err != nil {
		return nil, driverErr(err)
	}

	return it, nil
}

func (s *Service) Import(ctx context.Context, req *dto.NoSQLImportRequest) (int, error) {
	repo, _, err := s.open(ctx, req.ConnectionID)
	if err != nil {
		return 0, err
	}

	if err := s.require(ctx, repo, req.ContainerID, contract.CapTransfer, contract.CapInsert); err != nil {
		return 0, err
	}

	t, ok := repo.(contract.DataTransfer)
	if !ok {
		return 0, apperror.BadRequest(ErrToolNotSupported)
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "import", ContainerID: req.ContainerID, Count: 1}, req.Confirmed); err != nil {
		return 0, err
	}

	n, err := t.Import(ctx, req.ContainerID, req.Data, req.Format)
	if err != nil {
		return n, driverErr(err)
	}

	return n, nil
}

func (s *Service) admin(ctx context.Context, connectionID int32, containerID string) (contract.NoSQLRepository, contract.CollectionAdmin, error) {
	repo, _, err := s.open(ctx, connectionID)
	if err != nil {
		return nil, nil, err
	}

	if err := s.require(ctx, repo, containerID, contract.CapCollectionAdmin); err != nil {
		return nil, nil, err
	}

	a, ok := repo.(contract.CollectionAdmin)
	if !ok {
		return nil, nil, apperror.BadRequest(ErrToolNotSupported)
	}

	return repo, a, nil
}

func (s *Service) CollectionRename(ctx context.Context, req *dto.NoSQLCollectionRenameRequest) (string, error) {
	repo, a, err := s.admin(ctx, req.ConnectionID, req.ContainerID)
	if err != nil {
		return "", err
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "collection-rename", ContainerID: req.ContainerID, Count: 1}, req.Confirmed); err != nil {
		return "", err
	}

	id, err := a.RenameCollection(ctx, req.ContainerID, req.NewName)
	if err != nil {
		return "", driverErr(err)
	}

	return id, nil
}

func (s *Service) CollectionDrop(ctx context.Context, req *dto.NoSQLCollectionDropRequest) error {
	repo, a, err := s.admin(ctx, req.ConnectionID, req.ContainerID)
	if err != nil {
		return err
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "collection-drop", ContainerID: req.ContainerID, Count: 1}, req.Confirmed); err != nil {
		return err
	}

	if err := a.DropCollection(ctx, req.ContainerID); err != nil {
		return driverErr(err)
	}

	return nil
}

// ImportStart queues a background import of an uploaded file and returns the job id. The caller owns the file until
// this returns without an error; after that the job removes it.
func (s *Service) ImportStart(ctx context.Context, req *dto.NoSQLImportStartRequest) (uint, error) {
	repo, _, err := s.open(ctx, req.ConnectionID)
	if err != nil {
		return 0, err
	}

	if err := s.require(ctx, repo, req.ContainerID, contract.CapTransfer, contract.CapInsert); err != nil {
		return 0, err
	}

	if _, ok := repo.(contract.DataTransfer); !ok {
		return 0, apperror.BadRequest(ErrToolNotSupported)
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "import", ContainerID: req.ContainerID, Count: 1}, req.Confirmed); err != nil {
		return 0, err
	}

	owner := helper.CtxOwnerID(ctx)

	job, err := s.jobManager.CreateJob(model.JobTypeNoSQLImport, owner, helper.StructToJSON(dto.NoSQLImportJob{
		OwnerID: owner, ConnectionID: req.ConnectionID, ContainerID: req.ContainerID, Format: req.Format, Path: req.Path,
	}))
	if err != nil {
		return 0, apperror.InternalServerError(err)
	}

	return job.ID, nil
}
