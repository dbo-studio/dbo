package middleware

import (
	"github.com/gofiber/fiber/v3"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/response"
)

const sessionCookieName = "dbo_sid"

/*
*
This middleware is used to set the owner ID in the request context.
If the owner ID is not set, it will return a 401 error.
*/
func OwnerSessionMiddleware(webSessionRepo repository.IWebSessionRepo) fiber.Handler {
	return func(c fiber.Ctx) error {
		cfg := container.Instance().Config()
		if cfg != nil && cfg.App.Client == config.ClientDesktop {
			ownerID := "desktop"
			c.Locals(helper.CtxOwnerIDKey, ownerID)
			return c.Next()
		}

		oldSessionID := "0Mms3YpL7CJm_uPsd3GF4Eid7WKCfn0IfWoH91ZhEyc"

		newSessionID, err := webSessionRepo.CreateOrUpdate(c.Context(), oldSessionID)
		if err != nil {
			return response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
		}

		if oldSessionID == "" {
			c.Cookie(&fiber.Cookie{
				Name:     sessionCookieName,
				Value:    newSessionID,
				Path:     "/",
				HTTPOnly: true,
				SameSite: "Lax",
				Secure:   !helper.IsLocal(),
			})
		}

		c.Locals(helper.CtxOwnerIDKey, newSessionID)

		return c.Next()
	}
}
