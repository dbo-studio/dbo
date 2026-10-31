package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceDashboard "github.com/dbo-studio/dbo/internal/service/dashboard"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type DashboardShareHandler struct {
	logger       logger.Logger
	shareService serviceDashboard.IShareService
}

func NewDashboardShareHandler(logger logger.Logger, shareService serviceDashboard.IShareService) *DashboardShareHandler {
	return &DashboardShareHandler{logger: logger, shareService: shareService}
}

func (h DashboardShareHandler) send(c fiber.Ctx, data any, err error) error {
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(data).Send(c)
}

func (h DashboardShareHandler) List(c fiber.Ctx) error {
	list, err := h.shareService.List(c, fiber.Params[uint](c, "id"))

	return h.send(c, list, err)
}

func (h DashboardShareHandler) Create(c fiber.Ctx) error {
	req := new(dto.DashboardShareCreateRequest)
	// The body is optional: a link with no expiry and no password needs none.
	if len(c.Body()) > 0 {
		if err := c.Bind().Body(req); err != nil {
			return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
		}
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	share, err := h.shareService.Create(c, fiber.Params[uint](c, "id"), req)

	return h.send(c, share, err)
}

func (h DashboardShareHandler) Update(c fiber.Ctx) error {
	req := new(dto.DashboardShareUpdateRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	share, err := h.shareService.Update(c, fiber.Params[uint](c, "id"), fiber.Params[uint](c, "shareId"), req)

	return h.send(c, share, err)
}

func (h DashboardShareHandler) Revoke(c fiber.Ctx) error {
	share, err := h.shareService.Revoke(c, fiber.Params[uint](c, "id"), fiber.Params[uint](c, "shareId"))

	return h.send(c, share, err)
}

// View is the public page's data. It is a POST so the password travels in the body, not in a URL or a log line.
func (h DashboardShareHandler) View(c fiber.Ctx) error {
	req := new(dto.DashboardShareViewRequest)
	if len(c.Body()) > 0 {
		if err := c.Bind().Body(req); err != nil {
			return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
		}
	}

	view, err := h.shareService.View(c, c.Params("token"), req.Password)

	return h.send(c, view, err)
}
