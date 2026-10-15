package handler

import (
	"bufio"
	"context"
	"sync"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
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

func NewAiHandler(logger logger.Logger, ai serviceAI.IAiService) *AiHandler {
	return &AiHandler{
		logger:    logger,
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
		// fasthttp does not cancel the request context when the client goes
		// away, so a failed write is our disconnect signal: cancel the run so
		// provider calls and tools stop instead of finishing in the background.
		ctx, cancel := context.WithCancel(streamCtx)
		defer cancel()

		var mu sync.Mutex

		emit := func(data []byte) error {
			mu.Lock()
			defer mu.Unlock()

			if ctx.Err() != nil {
				return ctx.Err()
			}

			_, err := w.Write(data)
			if err == nil {
				_, err = w.WriteString("\n")
			}

			if err == nil {
				err = w.Flush()
			}

			if err != nil {
				cancel()
			}

			return err
		}

		// Heartbeat so a disconnect is noticed during long tool calls or before
		// the provider sends its first token.
		go func() {
			ticker := time.NewTicker(streamPingInterval)
			defer ticker.Stop()

			for {
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					_ = emit([]byte(`{"type":"ping"}`))
				}
			}
		}()

		if err := h.aiService.ChatStream(ctx, reqCopy, emit); err != nil {
			if ctx.Err() != nil {
				return
			}

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

const streamPingInterval = time.Second

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
		if !apperror.IsCanceled(err) {
			h.logger.Error(err.Error())
		}

		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}
