package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceDashboard "github.com/dbo-studio/dbo/internal/service/dashboard"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type DashboardSubscriptionHandler struct {
	logger  logger.Logger
	service serviceDashboard.ISubscriptionService
}

func NewDashboardSubscriptionHandler(logger logger.Logger, service serviceDashboard.ISubscriptionService) *DashboardSubscriptionHandler {
	return &DashboardSubscriptionHandler{logger: logger, service: service}
}

func (h DashboardSubscriptionHandler) send(c fiber.Ctx, data any, err error) error {
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(data).Send(c)
}

func (h DashboardSubscriptionHandler) bindRequest(c fiber.Ctx) (*dto.DashboardSubscriptionRequest, error) {
	req := new(dto.DashboardSubscriptionRequest)
	if err := c.Bind().Body(req); err != nil {
		return nil, apperror.BadRequest(err)
	}

	if err := req.Validate(); err != nil {
		return nil, apperror.Validation(err)
	}

	return req, nil
}

func (h DashboardSubscriptionHandler) List(c fiber.Ctx) error {
	list, err := h.service.List(c, fiber.Params[uint](c, "id"))

	return h.send(c, list, err)
}

func (h DashboardSubscriptionHandler) Create(c fiber.Ctx) error {
	req, err := h.bindRequest(c)
	if err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	sub, err := h.service.Create(c, fiber.Params[uint](c, "id"), req)

	return h.send(c, sub, err)
}

func (h DashboardSubscriptionHandler) Update(c fiber.Ctx) error {
	req, err := h.bindRequest(c)
	if err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	sub, err := h.service.Update(c, fiber.Params[uint](c, "id"), fiber.Params[uint](c, "subId"), req)

	return h.send(c, sub, err)
}

func (h DashboardSubscriptionHandler) Delete(c fiber.Ctx) error {
	return h.send(c, nil, h.service.Delete(c, fiber.Params[uint](c, "id"), fiber.Params[uint](c, "subId")))
}

func (h DashboardSubscriptionHandler) RunNow(c fiber.Ctx) error {
	run, err := h.service.RunNow(c, fiber.Params[uint](c, "id"), fiber.Params[uint](c, "subId"))

	return h.send(c, run, err)
}

func (h DashboardSubscriptionHandler) Runs(c fiber.Ctx) error {
	runs, err := h.service.Runs(c, fiber.Params[uint](c, "id"), fiber.Params[uint](c, "subId"))

	return h.send(c, runs, err)
}

func (h DashboardSubscriptionHandler) GetSmtp(c fiber.Ctx) error {
	settings, err := h.service.GetSmtp(c)

	return h.send(c, settings, err)
}

func (h DashboardSubscriptionHandler) SaveSmtp(c fiber.Ctx) error {
	req := new(dto.SmtpSettingsRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	settings, err := h.service.SaveSmtp(c, req)

	return h.send(c, settings, err)
}
