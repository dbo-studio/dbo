package handler

import (
	"github.com/gofiber/fiber/v3"
)

func Healthz(c fiber.Ctx) error {
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "ok"})
}
