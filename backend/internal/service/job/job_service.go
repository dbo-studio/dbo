package serviceJob

import (
	"context"
	"errors"
	"os"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/response"
)

type IJobService interface {
	Detail(ctx context.Context, req *dto.JobDetailRequest) (*dto.JobDetailResponse, error)
	Cancel(ctx context.Context, req *dto.JobDetailRequest) error
	Result(ctx context.Context, req *dto.JobDetailRequest) (*response.FileDownload, error)
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

func (i IJobServiceImpl) Result(ctx context.Context, req *dto.JobDetailRequest) (*response.FileDownload, error) {
	job, err := i.jobRepo.FindByOwner(ctx, req.JobID, helper.CtxOwnerID(ctx))
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrJobNotFound)
	}

	if job.Status != model.JobStatusCompleted {
		return nil, apperror.BadRequest(apperror.ErrJobNotCompleted)
	}

	if job.Type != model.JobTypeExport {
		return nil, apperror.BadRequest(errors.New("this job has no result"))
	}

	filePath := job.Result.FilePath
	if filePath == "" {
		return nil, apperror.BadRequest(errors.New("file path not found"))
	}

	fileName := job.Result.FileName
	if fileName == "" {
		fileName = "export"
	}

	fileContent, err := os.ReadFile(filePath)
	if err != nil {
		return nil, apperror.BadRequest(errors.New("failed to read file"))
	}

	contentType := "application/octet-stream"

	switch {
	case strings.HasSuffix(fileName, ".sql"):
		contentType = "application/sql"
	case strings.HasSuffix(fileName, ".json"):
		contentType = "application/json"
	case strings.HasSuffix(fileName, ".csv"):
		contentType = "text/csv"
	}

	return &response.FileDownload{
		FileName:    fileName,
		ContentType: contentType,
		Content:     fileContent,
	}, nil
}
