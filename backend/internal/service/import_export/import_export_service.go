package import_export

import (
	"context"
	"io"
	"log"
	"mime/multipart"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/service/job"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
)

type IImportExport interface {
	Import(ctx context.Context, req *dto.ImportRequest) (*dto.ImportResponse, error)
	Export(ctx context.Context, req *dto.ExportRequest) (*dto.ExportResponse, error)
}

type IImportExportImpl struct {
	jobManager job.IJobManager
}

func NewImportExportService(jobManager job.IJobManager) IImportExport {
	return IImportExportImpl{
		jobManager: jobManager,
	}
}

func (s IImportExportImpl) Import(_ context.Context, req *dto.ImportRequest) (*dto.ImportResponse, error) {
	file, err := req.Data.Open()
	if err != nil {
		return nil, apperror.BadRequest(err)
	}
	defer func(file multipart.File) {
		err := file.Close()
		if err != nil {
			log.Printf("Error closing file: %v", err)
		}
	}(file)

	fileData, err := io.ReadAll(file)
	if err != nil {
		return nil, apperror.BadRequest(err)
	}

	jobData := helper.StructToJson(dto.ImportJob{
		ConnectionId:    req.ConnectionId,
		Table:           req.Table,
		Data:            fileData,
		Format:          req.Format,
		ContinueOnError: req.ContinueOnError,
		SkipErrors:      req.SkipErrors,
		MaxErrors:       req.MaxErrors,
	})

	j, err := s.jobManager.CreateJob(model.JobTypeImport, jobData)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return &dto.ImportResponse{
		JobId: int32(j.ID),
	}, nil
}

func (s IImportExportImpl) Export(_ context.Context, req *dto.ExportRequest) (*dto.ExportResponse, error) {
	if req.ChunkSize <= 0 {
		req.ChunkSize = 1000
	}
	
	j, err := s.jobManager.CreateJob(model.JobTypeExport, helper.StructToJson(req))
	if err != nil {
		return nil, err
	}

	return &dto.ExportResponse{
		JobId: int32(j.ID),
	}, nil
}
