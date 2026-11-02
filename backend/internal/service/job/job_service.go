package serviceJob

import (
	"context"
	"errors"
	"os"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/goccy/go-json"
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
		ID:          job.ID,
		Type:        string(job.Type),
		Status:      string(job.Status),
		Result:      job.Result,
		Progress:    job.Progress,
		Message:     job.Message,
		Error:       job.Error,
		Data:        rawJSON(job.Data),
		StartedAt:   job.StartedAt,
		CompletedAt: job.CompletedAt,
	}, nil
}

// rawJSON passes stored JSON through as it is, and leaves out what is not JSON.
func rawJSON(data string) json.RawMessage {
	if !json.Valid([]byte(data)) {
		return nil
	}

	return json.RawMessage(data)
}

func (i IJobServiceImpl) Cancel(ctx context.Context, req *dto.JobDetailRequest) error {
	job, err := i.jobRepo.FindByOwner(ctx, req.JobID, helper.CtxOwnerID(ctx))
	if err != nil {
		return apperror.NotFound(apperror.ErrJobNotFound)
	}

	if job.Status == model.JobStatusCompleted || job.Status == model.JobStatusFailed {
		return apperror.BadRequest(apperror.ErrJobCannotCancel)
	}

	now := time.Now()
	if err := i.jobRepo.UpdateFieldsIfActive(ctx, job.ID, map[string]any{
		"status":       model.JobStatusCancelled,
		"message":      "Job canceled by user",
		"completed_at": &now,
	}); err != nil {
		return err
	}

	// Abort the running processor; the manager skips terminal status writes
	// when the job was canceled concurrently.
	i.jobManager.CancelRunning(uint(req.JobID))
	i.jobManager.Announce(ctx, uint(req.JobID))

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

	if !helper.IsReadableExportResultPath(filePath) {
		return nil, apperror.BadRequest(apperror.ErrInvalidSavePath)
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
