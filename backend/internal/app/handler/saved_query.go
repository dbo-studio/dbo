package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceSavedQuery "github.com/dbo-studio/dbo/internal/service/saved_query"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type SavedQueryHandler struct {
	logger            logger.Logger
	savedQueryService serviceSavedQuery.ISavedQueryService
}

func NewSavedQueryHandler(logger logger.Logger, savedQueryService serviceSavedQuery.ISavedQueryService) *SavedQueryHandler {
	return &SavedQueryHandler{
		logger:            logger,
		savedQueryService: savedQueryService,
	}
}

func (h SavedQueryHandler) Index(c fiber.Ctx) error {
	req := new(dto.SavedQueryListRequest)

	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder(apperror.Validation(err)).Send(c)
	}

	items, err := h.savedQueryService.Index(c.Context(), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(items.Items).Send(c)
}

func (h SavedQueryHandler) Create(c fiber.Ctx) error {
	req := new(dto.CreateSavedQueryRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder(apperror.Validation(err)).Send(c)
	}

	result, err := h.savedQueryService.Create(c.Context(), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(result).Send(c)
}

func (h SavedQueryHandler) Update(c fiber.Ctx) error {
	queryId := fiber.Params[int32](c, "id")
	req := new(dto.UpdateSavedQueryRequest)

	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder(apperror.Validation(err)).Send(c)
	}

	result, err := h.savedQueryService.Update(c.Context(), queryId, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(result).Send(c)
}

func (h SavedQueryHandler) Delete(c fiber.Ctx) error {
	queryId := fiber.Params[int32](c, "id")
	data, err := h.savedQueryService.Delete(c.Context(), queryId)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(data.Items).Send(c)
}
