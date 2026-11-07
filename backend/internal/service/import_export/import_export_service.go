package serviceImportExport

import (
	"encoding/json"

	"github.com/dbo-studio/dbo/internal/service/job/processors"
	"github.com/dbo-studio/dbo/pkg/logger"

	"context"
	"fmt"
	"io"
	"mime/multipart"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
)

type IImportExport interface {
	Import(ctx context.Context, req *dto.ImportRequest) (*dto.ImportResponse, error)
	ImportPreview(ctx context.Context, req *dto.ImportPreviewRequest) (*dto.ImportPreviewResponse, error)
	Export(ctx context.Context, req *dto.ExportRequest) (*dto.ExportResponse, error)
}

type IImportExportImpl struct {
	jobManager serviceJob.IJobManager
	cfg        *config.Config
	logger     logger.Logger
}

func NewImportExportService(jobManager serviceJob.IJobManager, cfg *config.Config, appLogger logger.Logger) IImportExport {
	return IImportExportImpl{
		jobManager: jobManager,
		cfg:        cfg,
		logger:     appLogger,
	}
}

// Upper bound on accepted import files (32 MiB) so a huge upload cannot
// exhaust memory before the job even starts.
const maxImportSize = 32 << 20

func (s IImportExportImpl) readUpload(header *multipart.FileHeader) ([]byte, error) {
	file, err := header.Open()
	if err != nil {
		return nil, apperror.BadRequest(err)
	}
	defer func(file multipart.File) {
		if err := file.Close(); err != nil {
			s.logger.Error(fmt.Errorf("failed to close upload: %w", err))
		}
	}(file)

	fileData, err := io.ReadAll(io.LimitReader(file, maxImportSize+1))
	if err != nil {
		return nil, apperror.BadRequest(err)
	}

	if len(fileData) > maxImportSize {
		return nil, apperror.BadRequest(apperror.ErrImportFileTooLarge)
	}

	return fileData, nil
}

func (s IImportExportImpl) ImportPreview(_ context.Context, req *dto.ImportPreviewRequest) (*dto.ImportPreviewResponse, error) {
	fileData, err := s.readUpload(req.Data)
	if err != nil {
		return nil, err
	}

	rows, columns, err := processors.ParseImportFile(req.Format, req.Delimiter, fileData)
	if err != nil {
		return nil, apperror.BadRequest(err)
	}

	return &dto.ImportPreviewResponse{Columns: columns, Rows: rows[:min(len(rows), 5)], TotalRows: len(rows)}, nil
}

func (s IImportExportImpl) Import(ctx context.Context, req *dto.ImportRequest) (*dto.ImportResponse, error) {
	fileData, err := s.readUpload(req.Data)
	if err != nil {
		return nil, err
	}

	var mapping map[string]string
	if req.Mapping != "" {
		if err := json.Unmarshal([]byte(req.Mapping), &mapping); err != nil {
			return nil, apperror.BadRequest(fmt.Errorf("invalid column mapping: %w", err))
		}
	}

	jobData := helper.StructToJSON(dto.ImportJob{
		OwnerID:         helper.CtxOwnerID(ctx),
		ConnectionID:    req.ConnectionID,
		Table:           req.Table,
		Data:            fileData,
		Format:          req.Format,
		Delimiter:       req.Delimiter,
		Mapping:         mapping,
		ContinueOnError: req.ContinueOnError,
		SkipErrors:      req.SkipErrors,
		MaxErrors:       req.MaxErrors,
	})

	j, err := s.jobManager.CreateJob(model.JobTypeImport, helper.CtxOwnerID(ctx), jobData)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return &dto.ImportResponse{
		JobID: int32(j.ID),
	}, nil
}

func (s IImportExportImpl) Export(ctx context.Context, req *dto.ExportRequest) (*dto.ExportResponse, error) {
	if req.ChunkSize <= 0 {
		req.ChunkSize = 1000
	}

	// SavePath is only honored for desktop builds, where it comes from the
	// native save dialog. Web clients must never control an absolute path.
	cfg := s.cfg
	if cfg == nil || cfg.App.Client != config.ClientDesktop {
		if req.SavePath != "" {
			return nil, apperror.BadRequest(apperror.ErrInvalidSavePath)
		}
	} else if err := helper.ValidateExportSavePath(req.SavePath, true); err != nil {
		return nil, apperror.BadRequest(apperror.ErrInvalidSavePath)
	}

	// Exports are read-only by definition; never hand a write statement to the
	// background job, which would bypass Safe Mode gating.
	if !req.IsMultiTable() {
		if class := sqlguard.ClassifySQL(req.Query).Class; class != sqlguard.ClassRead {
			return nil, apperror.BadRequest(apperror.ErrExportQueryNotRead)
		}
	}

	j, err := s.jobManager.CreateJob(model.JobTypeExport, helper.CtxOwnerID(ctx), helper.StructToJSON(dto.ExportJob{
		OwnerID:       helper.CtxOwnerID(ctx),
		ExportRequest: *req,
	}))
	if err != nil {
		return nil, err
	}

	return &dto.ExportResponse{
		JobID: int32(j.ID),
	}, nil
}
