package job

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/gofiber/fiber/v3"
)

type IJobService interface {
	Detail(ctx context.Context, req *dto.JobDetailRequest) (*dto.JobDetailResponse, error)
	Cancel(ctx context.Context, req *dto.JobDetailRequest) error
	Result(ctx fiber.Ctx, req *dto.JobDetailRequest) error
}

type IJobServiceImpl struct {
	jobRepo    repository.IJobRepo
	jobManager IJobManager
}

func NewJobService(jr repository.IJobRepo, jm IJobManager) IJobService {
	return &IJobServiceImpl{
		jobRepo:    jr,
		jobManager: jm,
	}
}

func (i IJobServiceImpl) Detail(ctx context.Context, req *dto.JobDetailRequest) (*dto.JobDetailResponse, error) {
	job, err := i.jobRepo.FindByOwner(ctx, req.JobID, helper.CtxOwnerID(ctx))
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrJobNotFound)
	}

	return &dto.JobDetailResponse{
		ID:       job.ID,
		Type:     string(job.Type),
		Status:   string(job.Status),
		Result:   job.Result,
		Progress: job.Progress,
		Message:  job.Message,
		Error:    job.Error,
	}, nil
}

func (i IJobServiceImpl) Cancel(ctx context.Context, req *dto.JobDetailRequest) error {
	job, err := i.jobRepo.FindByOwner(ctx, req.JobID, helper.CtxOwnerID(ctx))
	if err != nil {
		return apperror.NotFound(apperror.ErrJobNotFound)
	}

	if job.Status == model.JobStatusCompleted || job.Status == model.JobStatusFailed {
		return apperror.BadRequest(apperror.ErrJobCannotCancel)
	}

	job.Status = model.JobStatusCancelled
	job.Message = "Job canceled by user"

	if err := i.jobRepo.Update(ctx, job); err != nil {
		return err
	}

	// Abort the running processor; the manager skips terminal status writes
	// when the job was canceled concurrently.
	i.jobManager.CancelRunning(uint(req.JobID))

	return nil
}

func (i IJobServiceImpl) Result(c fiber.Ctx, req *dto.JobDetailRequest) error {
	job, err := i.jobRepo.FindByOwner(c, req.JobID, helper.CtxOwnerID(c))
	if err != nil {
		return apperror.NotFound(apperror.ErrJobNotFound)
	}

	if job.Status != model.JobStatusCompleted {
		return apperror.BadRequest(apperror.ErrJobNotCompleted)
	}

	if job.Type != model.JobTypeExport {
		return apperror.BadRequest(fmt.Errorf("this job has not result"))
	}

	filePath := job.Result.FilePath
	if filePath == "" {
		return apperror.BadRequest(errors.New("file path not found"))
	}

	fileName := job.Result.FileName
	if fileName == "" {
		fileName = "export"
	}

	fileContent, err := os.ReadFile(filePath)
	if err != nil {
		return apperror.BadRequest(errors.New("failed to read file"))
	}

	c.Set("Content-Disposition", "attachment; filename="+fileName)

	switch {
	case strings.HasSuffix(fileName, ".sql"):
		c.Set("Content-Type", "application/sql")
	case strings.HasSuffix(fileName, ".json"):
		c.Set("Content-Type", "application/json")
	case strings.HasSuffix(fileName, ".csv"):
		c.Set("Content-Type", "text/csv")
	default:
		c.Set("Content-Type", "application/octet-stream")
	}

	return c.Send(fileContent)
}
