package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceConnection "github.com/dbo-studio/dbo/internal/service/connection"
	serviceDesign "github.com/dbo-studio/dbo/internal/service/design"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type DesignHandler struct {
	logger            logger.Logger
	ConnectionService serviceConnection.IConnectionService
	DesignService     serviceDesign.IDesignService
}

func NewDesignHandler(logger logger.Logger, connectionService serviceConnection.IConnectionService, designService serviceDesign.IDesignService) *DesignHandler {
	return &DesignHandler{logger, connectionService, designService}
}

func (h DesignHandler) IndexList(c fiber.Ctx) error {
	req := new(dto.GetDesignIndexRequest)

	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder(apperror.Validation(err)).Send(c)
	}

	indexes, err := h.DesignService.IndexList(c.Context(), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(indexes.Indices).Send(c)
}

func (h DesignHandler) ColumnList(c fiber.Ctx) error {
	req := new(dto.GetDesignColumnRequest)

	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder(apperror.Validation(err)).Send(c)
	}

	structures, err := h.DesignService.ColumnList(c.Context(), req, false)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(structures.Columns).Send(c)
}

func (h DesignHandler) UpdateDesign(c fiber.Ctx) error {
	req := new(dto.UpdateDesignRequest)

	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder(apperror.Validation(err)).Send(c)
	}

	updateDesignResult, err := h.DesignService.UpdateDesign(c.Context(), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(updateDesignResult).Send(c)
}
