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
	return &QueryHandler{
		logger:       logger,
		queryService: queryService,
	}
}

func (h QueryHandler) Run(c fiber.Ctx) error {
	req := new(dto.RunQueryRequest)

	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, jobID, err := h.queryService.RunOrBackground(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return sendQueryResult(c, result, jobID)
}

// sendQueryResult answers a finished query with its result as before, and a query that moved to the
// background with 202 and the job to follow.
func sendQueryResult(c fiber.Ctx, result any, jobID uint) error {
	if jobID != 0 {
		c.Status(fiber.StatusAccepted)

		return response.SuccessBuilder().WithData(map[string]any{"status": "background", "jobId": jobID}).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h QueryHandler) Raw(c fiber.Ctx) error {
	req := new(dto.RawQueryRequest)

	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, jobID, err := h.queryService.RawOrBackground(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return sendQueryResult(c, result, jobID)
}

func (h QueryHandler) Update(c fiber.Ctx) error {
	req := new(dto.UpdateQueryRequest)

	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.queryService.Update(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}
