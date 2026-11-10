package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceAiChangeset "github.com/dbo-studio/dbo/internal/service/ai_changeset"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type AiChangesetHandler struct {
	logger             logger.Logger
	aiChangesetService serviceAiChangeset.IAiChangesetService
}

func NewAiChangesetHandler(logger logger.Logger, aiChangesetService serviceAiChangeset.IAiChangesetService) *AiChangesetHandler {
	return &AiChangesetHandler{
		logger:             logger,
		aiChangesetService: aiChangesetService,
	}
}

func (h AiChangesetHandler) Changesets(c fiber.Ctx) error {
	items, err := h.aiChangesetService.Index(c, fiber.Params[uint](c, "id"))
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(items).Send(c)
}

func (h AiChangesetHandler) Audit(c fiber.Ctx) error {
	req := new(dto.AiAuditListRequest)
	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	items, err := h.aiChangesetService.Audit(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(items).Send(c)
}

func (h AiChangesetHandler) Review(c fiber.Ctx) error {
	req := new(dto.AiChangesetReviewRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.aiChangesetService.Review(c, fiber.Params[uint](c, "id"), fiber.Params[uint](c, "changesetId"), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h AiChangesetHandler) EditOp(c fiber.Ctx) error {
	req := new(dto.SchemaChangeOp)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.aiChangesetService.EditOp(c, fiber.Params[uint](c, "id"), fiber.Params[uint](c, "changesetId"), fiber.Params[int](c, "position"), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h AiChangesetHandler) Before(c fiber.Ctx) error {
	structures, err := h.aiChangesetService.Before(c, fiber.Params[uint](c, "id"), fiber.Params[uint](c, "changesetId"))
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(structures).Send(c)
}

func (h AiChangesetHandler) PreviewOp(c fiber.Ctx) error {
	result, err := h.aiChangesetService.PreviewOp(c, fiber.Params[uint](c, "id"), fiber.Params[uint](c, "changesetId"), fiber.Params[int](c, "position"))
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h AiChangesetHandler) Preview(c fiber.Ctx) error {
	queries, err := h.aiChangesetService.Preview(c, fiber.Params[uint](c, "id"), fiber.Params[uint](c, "changesetId"))
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(dto.SchemaChangePreviewResponse{Queries: queries}).Send(c)
}

func (h AiChangesetHandler) Propose(c fiber.Ctx) error {
	req := new(dto.SchemaChangeRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	result, err := h.aiChangesetService.Propose(c, fiber.Params[uint](c, "id"), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h AiChangesetHandler) Apply(c fiber.Ctx) error {
	req := new(dto.AiChangesetApplyRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	result, err := h.aiChangesetService.Apply(c, fiber.Params[uint](c, "id"), fiber.Params[uint](c, "changesetId"), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h AiChangesetHandler) Undo(c fiber.Ctx) error {
	result, err := h.aiChangesetService.Undo(c, fiber.Params[uint](c, "id"), fiber.Params[uint](c, "changesetId"))
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}
