package handler

import (
	"bufio"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/container"
	serviceAI "github.com/dbo-studio/dbo/internal/service/ai"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/goccy/go-json"
	"github.com/gofiber/fiber/v3"
)

type AiHandler struct {
	logger    logger.Logger
	aiService serviceAI.IAiService
}

func NewAiHandler(ai serviceAI.IAiService) *AiHandler {
	return &AiHandler{
		logger:    container.Instance().Logger(),
		aiService: ai,
	}
}

func (h AiHandler) Chat(c fiber.Ctx) error {
	req := new(dto.AiChatRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.aiService.Chat(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h AiHandler) ChatStream(c fiber.Ctx) error {
	req := new(dto.AiChatRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	c.Set("Content-Type", "application/x-ndjson")
	c.Set("Cache-Control", "no-cache")
	c.Set("X-Accel-Buffering", "no")

	streamCtx := c.Context()
	reqCopy := req

	return c.SendStreamWriter(func(w *bufio.Writer) {
		emit := func(data []byte) error {
			if _, err := w.Write(data); err != nil {
				return err
			}
			if _, err := w.WriteString("\n"); err != nil {
				return err
			}
			return w.Flush()
		}

		if err := h.aiService.ChatStream(streamCtx, reqCopy, emit); err != nil {
			h.logger.Error(err.Error())
			errPayload, marshalErr := json.Marshal(map[string]string{
				"type":    "error",
				"message": err.Error(),
			})
			if marshalErr == nil {
				_ = emit(errPayload)
			}
		}
	})
}

func (h AiHandler) Complete(c fiber.Ctx) error {
	req := new(dto.AiInlineCompleteRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.aiService.Complete(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}
