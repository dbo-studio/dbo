package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/container"
	serviceSchema "github.com/dbo-studio/dbo/internal/service/schema"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type SchemaHandler struct {
	logger        logger.Logger
	schemaService serviceSchema.ISchemaService
}

func NewSchemaHandler(schemaService serviceSchema.ISchemaService) *SchemaHandler {
	return &SchemaHandler{
		logger:        container.Instance().Logger(),
		schemaService: schemaService,
	}
}

func (h *SchemaHandler) Diagram(c fiber.Ctx) error {
	req := new(dto.DiagramRequest)
	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.schemaService.Diagram(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}
