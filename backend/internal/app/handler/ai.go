package handler

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceAI "github.com/dbo-studio/dbo/internal/service/ai"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type AIHandler struct {
	logger    logger.Logger
	aiService serviceAI.IAIService
}

func NewAIHandler(logger logger.Logger, ai serviceAI.IAIService) *AIHandler {
	return &AIHandler{logger: logger, aiService: ai}
}

func (h AIHandler) Chat(c fiber.Ctx) error {
	req := new(dto.AIChatRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}
	res, err := h.aiService.Chat(context.Background(), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}
	return response.SuccessBuilder().WithData(res).Send(c)
}

func (h AIHandler) Complete(c fiber.Ctx) error {
	req := new(dto.AIInlineCompleteRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}
	res, err := h.aiService.Complete(context.Background(), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}
	return response.SuccessBuilder().WithData(res).Send(c)
}
