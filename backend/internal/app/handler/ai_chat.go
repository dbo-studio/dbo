package handler

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceAiChat "github.com/dbo-studio/dbo/internal/service/ai_chat"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
	"github.com/samber/lo"
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
		PaginationRequest: dto.PaginationRequest{
			Page:  lo.ToPtr(fiber.Query(c, "page", 1)),
			Count: lo.ToPtr(fiber.Query(c, "count", 10)),
		},
	}

	connection, err := h.aiChatService.Detail(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(connection).Send(c)
}

func (h AiChatHandler) Create(c fiber.Ctx) error {
	req := new(dto.AiChatCreateRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.aiChatService.Create(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
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
