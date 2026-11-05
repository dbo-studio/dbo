package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceCLI "github.com/dbo-studio/dbo/internal/service/cli"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type CLIHandler struct {
	logger  logger.Logger
	service serviceCLI.ICLIService
}

func NewCLIHandler(logger logger.Logger, service serviceCLI.ICLIService) *CLIHandler {
	return &CLIHandler{logger: logger, service: service}
}

func (h *CLIHandler) Run(c fiber.Ctx) error {
	req := new(dto.CliRunRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.Run(c, req)
	if err != nil {
		h.logger.Error(err.Error())

		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}
