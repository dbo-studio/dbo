package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceSchemaDiagram "github.com/dbo-studio/dbo/internal/service/schema_diagram"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type SchemaDiagramHandler struct {
	logger               logger.Logger
	schemaDiagramService serviceSchemaDiagram.ISchemaDiagramService
}

func NewSchemaDiagramHandler(logger logger.Logger, schemaDiagramService serviceSchemaDiagram.ISchemaDiagramService) *SchemaDiagramHandler {
	return &SchemaDiagramHandler{
		logger:               logger,
		schemaDiagramService: schemaDiagramService,
	}
}

func (h *SchemaDiagramHandler) GetDiagram(c fiber.Ctx) error {
	req := new(dto.SchemaDiagramRequest)
	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.schemaDiagramService.GetDiagram(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *SchemaDiagramHandler) SaveLayout(c fiber.Ctx) error {
	req := new(dto.SaveLayoutRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	err := h.schemaDiagramService.SaveLayout(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().Send(c)
}

func (h *SchemaDiagramHandler) CreateRelationship(c fiber.Ctx) error {
	req := new(dto.SaveRelationshipRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	err := h.schemaDiagramService.CreateRelationship(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().Send(c)
}

func (h *SchemaDiagramHandler) DeleteRelationship(c fiber.Ctx) error {
	req := new(dto.DeleteRelationshipRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	err := h.schemaDiagramService.DeleteRelationship(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().Send(c)
}
