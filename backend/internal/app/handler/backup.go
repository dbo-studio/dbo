package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceBackup "github.com/dbo-studio/dbo/internal/service/backup"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type BackupHandler struct {
	logger  logger.Logger
	service serviceBackup.IBackupService
}

func NewBackupHandler(logger logger.Logger, service serviceBackup.IBackupService) *BackupHandler {
	return &BackupHandler{
		logger:  logger,
		service: service,
	}
}

func (h BackupHandler) Create(c fiber.Ctx) error {
	req := new(dto.BackupRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.Create(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithMessage("Backup job started").WithData(result).Send(c)
}

func (h BackupHandler) Restore(c fiber.Ctx) error {
	req := new(dto.RestoreRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.Restore(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithMessage("Restore job started").WithData(result).Send(c)
}

func (h BackupHandler) History(c fiber.Ctx) error {
	req := new(dto.BackupHistoryRequest)
	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	result, err := h.service.History(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h BackupHandler) Download(c fiber.Ctx) error {
	req := &dto.BackupDownloadRequest{ID: fiber.Params[uint](c, "id")}

	file, err := h.service.Download(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return file.Send(c)
}

func (h BackupHandler) Tools(c fiber.Ctx) error {
	return response.SuccessBuilder().WithData(h.service.Tools(c)).Send(c)
}
