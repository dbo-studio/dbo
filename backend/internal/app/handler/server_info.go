package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

func (h *TreeHandler) ServerCapabilities(c fiber.Ctx) error {
	out, err := h.treeService.ServerCapabilities(c, fiber.Query[int32](c, "connectionId"))
	if err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(out).Send(c)
}

func (h *TreeHandler) ServerPanel(c fiber.Ctx) error {
	out, err := h.treeService.ServerPanel(c, fiber.Query[int32](c, "connectionId"), fiber.Params[string](c, "panel"))
	if err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(out).Send(c)
}

func (h *TreeHandler) EndServerActivity(c fiber.Ctx) error {
	var body dto.ServerActivityRequest
	if err := c.Bind().Body(&body); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := body.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	if err := h.treeService.EndServerActivity(c, body.ConnectionID, body.Target, body.Token, body.Confirmed); err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().Send(c)
}
