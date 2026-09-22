package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceAdminUsers "github.com/dbo-studio/dbo/internal/service/admin_users"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type AdminUsersHandler struct {
	logger  logger.Logger
	service serviceAdminUsers.IAdminUsersService
}

func NewAdminUsersHandler(logger logger.Logger, service serviceAdminUsers.IAdminUsersService) *AdminUsersHandler {
	return &AdminUsersHandler{logger: logger, service: service}
}

func (h AdminUsersHandler) List(c fiber.Ctx) error {
	items, err := h.service.List(c)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(items).Send(c)
}

func (h AdminUsersHandler) Create(c fiber.Ctx) error {
	req := new(dto.AdminCreateUserRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	item, err := h.service.Create(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(item).Send(c)
}

func (h AdminUsersHandler) Update(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.ErrorBuilder().FromError(apperror.BadRequest(apperror.ErrUserNotFound)).Send(c)
	}

	req := new(dto.AdminUpdateUserRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	item, err := h.service.Update(c, id, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(item).Send(c)
}
