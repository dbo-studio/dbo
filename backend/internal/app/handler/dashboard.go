package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceDashboard "github.com/dbo-studio/dbo/internal/service/dashboard"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type DashboardHandler struct {
	logger           logger.Logger
	dashboardService serviceDashboard.IDashboardService
}

func NewDashboardHandler(logger logger.Logger, dashboardService serviceDashboard.IDashboardService) *DashboardHandler {
	return &DashboardHandler{logger: logger, dashboardService: dashboardService}
}

func (h DashboardHandler) send(c fiber.Ctx, data any, err error) error {
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(data).Send(c)
}

func (h DashboardHandler) Dashboards(c fiber.Ctx) error {
	req := new(dto.DashboardListRequest)
	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	items, err := h.dashboardService.Index(c, req)

	return h.send(c, items, err)
}

func (h DashboardHandler) Create(c fiber.Ctx) error {
	req := new(dto.DashboardCreateRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	item, err := h.dashboardService.Create(c, req)

	return h.send(c, item, err)
}

func (h DashboardHandler) Rename(c fiber.Ctx) error {
	req := new(dto.DashboardRenameRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	item, err := h.dashboardService.Rename(c, fiber.Params[uint](c, "id"), req)

	return h.send(c, item, err)
}

func (h DashboardHandler) Duplicate(c fiber.Ctx) error {
	item, err := h.dashboardService.Duplicate(c, fiber.Params[uint](c, "id"))

	return h.send(c, item, err)
}

func (h DashboardHandler) Delete(c fiber.Ctx) error {
	return h.send(c, nil, h.dashboardService.Delete(c, fiber.Params[uint](c, "id")))
}

func (h DashboardHandler) Pin(c fiber.Ctx) error {
	req := new(dto.DashboardPinRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	item, err := h.dashboardService.Pin(c, fiber.Params[uint](c, "id"), req)

	return h.send(c, item, err)
}

func (h DashboardHandler) UpdateCard(c fiber.Ctx) error {
	req := new(dto.DashboardCardUpdateRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	item, err := h.dashboardService.UpdateCard(c, fiber.Params[uint](c, "id"), fiber.Params[uint](c, "cardId"), req)

	return h.send(c, item, err)
}

func (h DashboardHandler) ReorderCards(c fiber.Ctx) error {
	req := new(dto.DashboardCardOrderRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	item, err := h.dashboardService.ReorderCards(c, fiber.Params[uint](c, "id"), req)

	return h.send(c, item, err)
}

func (h DashboardHandler) Unpin(c fiber.Ctx) error {
	item, err := h.dashboardService.Unpin(c, fiber.Params[uint](c, "id"), fiber.Params[uint](c, "cardId"))

	return h.send(c, item, err)
}
