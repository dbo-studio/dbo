package handler

import (
	"net/http"

	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceMCP "github.com/dbo-studio/dbo/internal/service/mcp"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/adaptor"
)

type McpHandler struct {
	logger     logger.Logger
	mcpService serviceMCP.IMcpService
}

func NewMcpHandler(logger logger.Logger, mcp serviceMCP.IMcpService) *McpHandler {
	return &McpHandler{
		logger:     logger,
		mcpService: mcp,
	}
}

func (h McpHandler) Status(c fiber.Ctx) error {
	result, err := h.mcpService.Status(c)
	if err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h McpHandler) Update(c fiber.Ctx) error {
	req := new(dto.McpUpdateRequest)

	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	result, err := h.mcpService.Update(c, req)
	if err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h McpHandler) RegenerateToken(c fiber.Ctx) error {
	result, err := h.mcpService.RegenerateToken(c)
	if err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h McpHandler) Proxy(c fiber.Ctx) error {
	token := serviceMCP.ExtractBearer(c.Get("Authorization"))

	settings, ok := h.mcpService.AuthenticateToken(c, token)
	if !ok {
		return response.ErrorBuilder().FromError(apperror.Unauthorized(0)).Send(c)
	}

	c.Locals(helper.CtxOwnerIDKey, settings.OwnerID)
	ownerCtx := helper.CtxWithOwnerID(c.Context(), settings.OwnerID)
	c.SetContext(ownerCtx)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h.mcpService.HTTPHandler().ServeHTTP(w, r.WithContext(ownerCtx))
	})

	return adaptor.HTTPHandlerWithContext(handler)(c)
}
