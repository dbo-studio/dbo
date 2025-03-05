package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceQuery "github.com/dbo-studio/dbo/internal/service/query"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type QueryHandler struct {
	logger       logger.Logger
	queryService serviceQuery.IQueryService
}

func NewQueryHandler(logger logger.Logger, queryService serviceQuery.IQueryService) *QueryHandler {
	return &QueryHandler{logger, queryService}
}

func (h QueryHandler) Run(c fiber.Ctx) error {
	req := new(dto.RunQueryRequest)

	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder(apperror.Validation(err)).Send(c)
	}

	result, err := h.queryService.Run(c.Context(), req)

	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(result).Send(c)
}
