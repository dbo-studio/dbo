package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/container"
	serviceMcp "github.com/dbo-studio/dbo/internal/service/mcp"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/adaptor"
)

type McpHandler struct {
	logger     logger.Logger
	mcpService serviceMcp.IMcpService
}

func NewMcpHandler(mcp serviceMcp.IMcpService) *McpHandler {
	return &McpHandler{
		logger:     container.Instance().Logger(),
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
	if !h.mcpService.IsEnabled(c) {
		return response.ErrorBuilder().FromError(apperror.Unauthorized(0)).Send(c)
	}

	token := serviceMcp.ExtractBearer(c.Get("Authorization"))
	if token == "" || !h.mcpService.ValidateToken(c, token) {
		return response.ErrorBuilder().FromError(apperror.Unauthorized(0)).Send(c)
	}

	return adaptor.HTTPHandler(h.mcpService.HTTPHandler())(c)
}
