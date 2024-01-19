package handler

import "github.com/gofiber/fiber/v2"

type QueryHandlers struct{}

func (h *QueryHandlers) RunQuery(ctx *fiber.Ctx) error {
	return ctx.Send(ctx.Body())
}
