package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai_provider"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type AiProviderHandler struct {
	logger            logger.Logger
	aiProviderService serviceAiProvider.IAiProviderService
}

func NewAiProviderHandler(logger logger.Logger, aiProviderService serviceAiProvider.IAiProviderService) *AiProviderHandler {
	return &AiProviderHandler{
		logger:            logger,
		aiProviderService: aiProviderService,
	}
}

func (h AiProviderHandler) Providers(c fiber.Ctx) error {
	items, err := h.aiProviderService.Index(c)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(items.Items).Send(c)
}

func (h AiProviderHandler) Update(c fiber.Ctx) error {
	queryId := fiber.Params[uint](c, "id")
	req := new(dto.AiProviderUpdateRequest)

	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.aiProviderService.Update(c, queryId, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}
