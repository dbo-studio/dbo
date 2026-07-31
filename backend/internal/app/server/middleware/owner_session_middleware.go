package middleware

import (
	"time"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

const (
	sessionCookieName    = "dbo_sid"
	sessionTouchInterval = 60 * time.Second
)

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
			c.SetContext(helper.CtxWithOwnerID(c.Context(), ownerID))
			return c.Next()
		}

		oldSessionID := c.Cookies(sessionCookieName)

		var newSessionID string
		var err error

		if oldSessionID == "" {
			newSessionID, err = webSessionRepo.Create(c.Context())
			if err != nil {
				return response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
			}

			// Secure must match the actual request scheme. Browsers (especially Safari)
			// reject Secure cookies on http://localhost, which creates a new owner
			// session per request and makes POST /connections appear to "return empty".
			c.Cookie(&fiber.Cookie{
				Name:     sessionCookieName,
				Value:    newSessionID,
				Path:     "/",
				HTTPOnly: true,
				SameSite: "Lax",
				Secure:   c.Protocol() == "https",
			})
		} else {
			newSessionID = oldSessionID
			if err := webSessionRepo.TouchLastSeenDebounced(c.Context(), oldSessionID, sessionTouchInterval); err != nil {
				return response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
			}
		}

		c.Locals(helper.CtxOwnerIDKey, newSessionID)
		c.SetContext(helper.CtxWithOwnerID(c.Context(), newSessionID))

		return c.Next()
	}
}
