package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceAccount "github.com/dbo-studio/dbo/internal/service/account"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type AccountHandler struct {
	logger         logger.Logger
	accountService serviceAccount.IAccountService
}

func NewAccountHandler(logger logger.Logger, accountService serviceAccount.IAccountService) *AccountHandler {
	return &AccountHandler{logger: logger, accountService: accountService}
}

func (h AccountHandler) ConnectStart(c fiber.Ctx) error {
	result, err := h.accountService.ConnectStart(c)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h AccountHandler) ConnectPoll(c fiber.Ctx) error {
	req := new(dto.AccountConnectPollRequest)
	if err := c.Bind().Body(req); err != nil {
		return h.fail(c, apperror.BadRequest(err))
	}

	if err := req.Validate(); err != nil {
		return h.fail(c, apperror.Validation(err))
	}

	result, err := h.accountService.ConnectPoll(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h AccountHandler) fail(c fiber.Ctx, err error) error {
	h.logger.Error(err.Error())

	return response.ErrorBuilder().FromError(err).Send(c)
}
