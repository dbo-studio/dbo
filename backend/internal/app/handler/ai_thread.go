package handler

import (
	"context"
	"strconv"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type AIThreadHandler struct{ repo repository.IAiRepo }

func NewAIThreadHandler(repo repository.IAiRepo) *AIThreadHandler {
	return &AIThreadHandler{repo: repo}
}

func (h *AIThreadHandler) List(c fiber.Ctx) error {
	items, err := h.repo.ListThreads(context.Background())
	if err != nil {
		return response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
	}
	return response.SuccessBuilder().WithData(items).Send(c)
}

func (h *AIThreadHandler) Create(c fiber.Ctx) error {
	var t model.AIThread
	if err := c.Bind().Body(&t); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}
	if err := h.repo.CreateThread(context.Background(), &t); err != nil {
		return response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
	}
	return response.SuccessBuilder().WithData(t).Send(c)
}

func (h *AIThreadHandler) Delete(c fiber.Ctx) error {
	idStr := c.Params("id")
	id64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}
	if err := h.repo.DeleteThread(context.Background(), uint(id64)); err != nil {
		return response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
	}
	return response.SuccessBuilder().Send(c)
}

func (h *AIThreadHandler) Messages(c fiber.Ctx) error {
	idStr := c.Params("id")
	id64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}
	items, err := h.repo.ListMessages(context.Background(), uint(id64))
	if err != nil {
		return response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
	}
	return response.SuccessBuilder().WithData(items).Send(c)
}

func (h *AIThreadHandler) AddMessage(c fiber.Ctx) error {
	var m model.AIMessage
	if err := c.Bind().Body(&m); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}
	if err := h.repo.AddMessage(context.Background(), &m); err != nil {
		return response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
	}
	return response.SuccessBuilder().WithData(m).Send(c)
}
