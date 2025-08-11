package handler

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceAiChat "github.com/dbo-studio/dbo/internal/service/ai_chat"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type AiChatHandler struct {
	logger        logger.Logger
	aiChatService serviceAiChat.IAiChatService
}

func NewAiChatHandler(logger logger.Logger, aiChatService serviceAiChat.IAiChatService) *AiChatHandler {
	return &AiChatHandler{
		logger:        logger,
		aiChatService: aiChatService,
	}
}

func (h AiChatHandler) Chats(c fiber.Ctx) error {
	items, err := h.aiChatService.Index(context.Background())
	if err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(items.Chats).Send(c)
}

func (h AiChatHandler) Detail(c fiber.Ctx) error {
	req := &dto.AiChatDetailRequest{
		AiChatId: fiber.Params[uint](c, "id"),
	}

	connection, err := h.aiChatService.Detail(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(connection).Send(c)
}

func (h AiChatHandler) Create(c fiber.Ctx) error {
	req := &dto.AiChatDetailRequest{
		AiChatId: fiber.Params[uint](c, "id"),
	}

	connection, err := h.aiChatService.Detail(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(connection).Send(c)
}

func (h AiChatHandler) Delete(c fiber.Ctx) error {
	chatId := fiber.Params[uint](c, "id")
	data, err := h.aiChatService.Delete(c, chatId)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(data.Chats).Send(c)
}
