package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/internal/service/import_export"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type ImportExportHandler struct {
	logger              logger.Logger
	importExportService import_export.IImportExport
}

func NewImportExportHandler(importExportService import_export.IImportExport) *ImportExportHandler {
	return &ImportExportHandler{
		logger:              container.Instance().Logger(),
		importExportService: importExportService,
	}
}

func (h ImportExportHandler) Start(c fiber.Ctx) error {
	req := new(dto.ImportRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.importExportService.Import(c, req)
	if err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	return response.SuccessBuilder().WithData(result).WithMessage("Import job started").Send(c)
}

func (h ImportExportHandler) Export(c fiber.Ctx) error {
	req := new(dto.ExportRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.importExportService.Export(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithMessage("Export job started").WithData(result).Send(c)
}
