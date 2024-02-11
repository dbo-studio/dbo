package handler

import (
	"github.com/gofiber/fiber/v2"
)

type QueryHandler struct{}

func (h *QueryHandler) RunQuery(c *fiber.Ctx) error {
	// req := new(types.RunQueryRequest)

	// if err := c.BodyParser(req); err != nil {
	// 	return c.Status(fiber.StatusBadRequest).JSON(helper.DefaultResponse(nil, err.Error(), 0))
	// }

	// errors := helper.Validate(req)
	// if errors != nil {
	// 	return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	// }

	// result, err := drivers.RunQuery(req)
	// if err != nil {
	// 	return c.JSON(helper.DefaultResponse("", err.Error(), 0))
	// }

	// return c.JSON(helper.DefaultResponse(result, "", 1))
	return nil
}
