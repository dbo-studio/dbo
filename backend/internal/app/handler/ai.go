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

type AiHandler struct {
	logger    logger.Logger
	aiService serviceAI.IAiService
}

func NewAiHandler(logger logger.Logger, ai serviceAI.IAiService) *AiHandler {
	return &AiHandler{logger: logger, aiService: ai}
}

func (h AiHandler) Chat(c fiber.Ctx) error {
	req := new(dto.AiChatRequest)
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

func (h AiHandler) Complete(c fiber.Ctx) error {
	req := new(dto.AiInlineCompleteRequest)
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
