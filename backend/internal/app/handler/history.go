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
		return response.ErrorBuilder(apperror.BadRequest(err)).Send(c)
	}

	items, err := h.historyService.HistoryList(c.Context(), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(items.Items).Send(c)
}
