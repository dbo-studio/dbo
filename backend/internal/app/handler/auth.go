package handler

import (
	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/app/server/middleware"
	serviceAuth "github.com/dbo-studio/dbo/internal/service/auth"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type AuthHandler struct {
	logger  logger.Logger
	service serviceAuth.IAuthService
	cfg     *config.Config
}

func NewAuthHandler(logger logger.Logger, service serviceAuth.IAuthService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{logger: logger, service: service, cfg: cfg}
}

func (h AuthHandler) publicURL() string {
	if h.cfg == nil {
		return ""
	}

	return h.cfg.App.PublicURL
}

func (h AuthHandler) Status(c fiber.Ctx) error {
	result, err := h.service.Status(c)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h AuthHandler) Login(c fiber.Ctx) error {
	req := new(dto.AuthLoginRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	sessionID, err := h.service.Login(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	middleware.SetSessionCookie(c, sessionID, h.publicURL())

	return response.SuccessBuilder().Send(c)
}

func (h AuthHandler) ChangePassword(c fiber.Ctx) error {
	req := new(dto.AuthChangePasswordRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	sessionID, err := h.service.ChangePassword(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	middleware.SetSessionCookie(c, sessionID, h.publicURL())

	return response.SuccessBuilder().Send(c)
}

func (h AuthHandler) Logout(c fiber.Ctx) error {
	sessionID := helper.CtxSessionID(c)
	if sessionID == "" {
		sessionID = c.Cookies(serviceAuth.SessionCookieName)
	}

	if err := h.service.Logout(c, sessionID); err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	middleware.ClearSessionCookies(c, h.publicURL())

	return response.SuccessBuilder().Send(c)
}
