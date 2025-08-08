package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceHistory "github.com/dbo-studio/dbo/internal/service/history"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type HistoryHandler struct {
	logger         logger.Logger
	historyService serviceHistory.IHistoryService
}

func NewHistoryHandler(logger logger.Logger, historyService serviceHistory.IHistoryService) *HistoryHandler {
	return &HistoryHandler{logger, historyService}
}

func (h *HistoryHandler) Histories(c fiber.Ctx) error {
	req := new(dto.HistoryListRequest)

	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	items, err := h.historyService.Index(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(items.Items).Send(c)
}

func (h *HistoryHandler) Delete(c fiber.Ctx) error {
	req := new(dto.DeleteHistoryRequest)

	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	err := h.historyService.DeleteAll(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().Send(c)
}
