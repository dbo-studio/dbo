package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceQuestion "github.com/dbo-studio/dbo/internal/service/question"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type QuestionHandler struct {
	logger          logger.Logger
	questionService serviceQuestion.IQuestionService
}

func NewQuestionHandler(logger logger.Logger, questionService serviceQuestion.IQuestionService) *QuestionHandler {
	return &QuestionHandler{logger: logger, questionService: questionService}
}

func (h QuestionHandler) Questions(c fiber.Ctx) error {
	req := new(dto.QuestionListRequest)
	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	items, err := h.questionService.Index(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(items).Send(c)
}

func (h QuestionHandler) Create(c fiber.Ctx) error {
	req := new(dto.QuestionCreateRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	item, err := h.questionService.Create(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(item).Send(c)
}

func (h QuestionHandler) Update(c fiber.Ctx) error {
	req := new(dto.QuestionUpdateRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	item, err := h.questionService.Update(c, fiber.Params[uint](c, "id"), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(item).Send(c)
}

func (h QuestionHandler) Delete(c fiber.Ctx) error {
	if err := h.questionService.Delete(c, fiber.Params[uint](c, "id")); err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().Send(c)
}

func (h QuestionHandler) Run(c fiber.Ctx) error {
	req := new(dto.QuestionRunRequest)
	// The body is optional: a report without filters runs with none.
	if len(c.Body()) > 0 {
		if err := c.Bind().Body(req); err != nil {
			return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
		}
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.questionService.Run(c, fiber.Params[uint](c, "id"), req.Params)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h QuestionHandler) Preview(c fiber.Ctx) error {
	req := new(dto.QuestionPreviewRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.questionService.Preview(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}
