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

func (h BackupHandler) ToolDownloads(c fiber.Ctx) error {
	result, err := h.service.ToolDownloads(c)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h BackupHandler) InstallTool(c fiber.Ctx) error {
	req := new(dto.ToolInstallRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.InstallTool(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithMessage("Tool download started").WithData(result).Send(c)
}

func (h BackupHandler) toolPath(c fiber.Ctx) (*dto.ToolPathRequest, error) {
	req := new(dto.ToolPathRequest)
	if err := c.Bind().Body(req); err != nil {
		return nil, apperror.BadRequest(err)
	}

	req.Name = c.Params("name")
	if err := req.Validate(); err != nil {
		return nil, apperror.Validation(err)
	}

	return req, nil
}

func (h BackupHandler) SetToolPath(c fiber.Ctx) error {
	req, err := h.toolPath(c)
	if err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	tool, err := h.service.SetToolPath(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(tool).Send(c)
}

func (h BackupHandler) TestToolPath(c fiber.Ctx) error {
	req, err := h.toolPath(c)
	if err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	tool, err := h.service.TestToolPath(c, req)
	if err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(tool).Send(c)
}

func (h BackupHandler) ClearToolPath(c fiber.Ctx) error {
	if err := h.service.ClearToolPath(c, c.Params("name")); err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().Send(c)
}

func (h BackupHandler) RemoveTool(c fiber.Ctx) error {
	req := &dto.ToolRemoveRequest{
		Driver:  c.Params("driver"),
		Version: c.Params("version"),
	}

	if err := h.service.RemoveTool(c, req); err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().Send(c)
}

func (h BackupHandler) Upload(c fiber.Ctx) error {
	req := new(dto.BackupUploadRequest)
	if err := c.Bind().Form(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	file, err := c.FormFile("file")
	if err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	req.File = file

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.Upload(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

// Drill queues a restore test of a backup. The body is optional: it only carries a passphrase.
func (h BackupHandler) Drill(c fiber.Ctx) error {
	req := new(dto.BackupDrillRequest)
	_ = c.Bind().Body(req)
	req.ID = fiber.Params[uint](c, "id")

	result, err := h.service.Drill(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h BackupHandler) Verify(c fiber.Ctx) error {
	req := new(dto.BackupVerifyRequest)
	// The body is optional: it only carries a passphrase.
	_ = c.Bind().Body(req)
	req.ID = fiber.Params[uint](c, "id")

	result, err := h.service.Verify(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}
