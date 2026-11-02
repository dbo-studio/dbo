package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceBackup "github.com/dbo-studio/dbo/internal/service/backup"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type BackupScheduleHandler struct {
	logger  logger.Logger
	service serviceBackup.IBackupScheduleService
}

func NewBackupScheduleHandler(logger logger.Logger, service serviceBackup.IBackupScheduleService) *BackupScheduleHandler {
	return &BackupScheduleHandler{logger: logger, service: service}
}

func (h BackupScheduleHandler) List(c fiber.Ctx) error {
	result, err := h.service.List(c)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h BackupScheduleHandler) Create(c fiber.Ctx) error {
	req := new(dto.BackupScheduleRequest)
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

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h BackupScheduleHandler) Update(c fiber.Ctx) error {
	req := new(dto.BackupScheduleUpdateRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	req.ID = fiber.Params[uint](c, "id")

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.Update(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h BackupScheduleHandler) Delete(c fiber.Ctx) error {
	if err := h.service.Delete(c, &dto.BackupScheduleIDRequest{ID: fiber.Params[uint](c, "id")}); err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().Send(c)
}

func (h BackupScheduleHandler) Run(c fiber.Ctx) error {
	result, err := h.service.Run(c, &dto.BackupScheduleIDRequest{ID: fiber.Params[uint](c, "id")})
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithMessage("Backup job started").WithData(result).Send(c)
}
