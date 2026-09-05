package serviceImportExport

import (
	"github.com/dbo-studio/dbo/pkg/logger"

	"context"
	"fmt"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"

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

func (s IImportExportImpl) Import(ctx context.Context, req *dto.ImportRequest) (*dto.ImportResponse, error) {
	file, err := req.Data.Open()
	if err != nil {
		return nil, apperror.BadRequest(err)
	}
	defer func(file multipart.File) {
		if err := file.Close(); err != nil {
			s.logger.Error(fmt.Errorf("failed to close upload: %w", err))
		}
	}(file)

	// Upper bound on accepted import files (32 MiB) so a huge upload cannot
	// exhaust memory before the job even starts.
	const maxImportSize = 32 << 20

	fileData, err := io.ReadAll(io.LimitReader(file, maxImportSize+1))
	if err != nil {
		return nil, apperror.BadRequest(err)
	}

	if len(fileData) > maxImportSize {
		return nil, apperror.BadRequest(apperror.ErrImportFileTooLarge)
	}

	jobData := helper.StructToJSON(dto.ImportJob{
		OwnerID:         helper.CtxOwnerID(ctx),
		ConnectionID:    req.ConnectionID,
		Table:           req.Table,
		Data:            fileData,
		Format:          req.Format,
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
		req.SavePath = ""
	} else if err := validateSavePath(req.SavePath); err != nil {
		return nil, err
	}

	// Exports are read-only by definition; never hand a write statement to the
	// background job, which would bypass Safe Mode gating.
	if class := sqlguard.ClassifySQL(req.Query).Class; class != sqlguard.ClassRead {
		return nil, apperror.BadRequest(apperror.ErrExportQueryNotRead)
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

func validateSavePath(savePath string) error {
	if savePath == "" {
		return nil
	}

	for _, part := range strings.Split(filepath.ToSlash(savePath), "/") {
		if part == ".." {
			return apperror.BadRequest(apperror.ErrInvalidSavePath)
		}
	}

	return nil
}
