package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/goccy/go-json"
	"github.com/gofiber/fiber/v3"
)

const (
	sessionCookieName    = "dbo_sid"
	sessionTouchInterval = 60 * time.Second
	authExchangePath     = "/api/config/auth"
	mcpProxyPrefix       = "/api/mcp"
)

type authExchangeRequest struct {
	Token string `json:"token"`
}

/*
*
This middleware resolves the owner ID for the request.

  - Desktop mode: the owner is always "desktop".
  - Web mode (local): visitors without a valid session cookie get a fresh session.
  - Web mode with APP_AUTH_TOKEN set (server deployments): only sessions created by
    exchanging the auth token (POST /api/config/auth) are accepted; everything else
    gets 401.
*/
func OwnerSessionMiddleware(cfg *config.Config, webSessionRepo repository.IWebSessionRepo) fiber.Handler {
	return func(c fiber.Ctx) error {
		if cfg != nil && cfg.App.Client == config.ClientDesktop {
			setOwner(c, "desktop")

			return c.Next()
		}

		// The MCP proxy authenticates with its own bearer token and re-scopes
		// the owner itself; session handling would insert junk session rows.
		if isBearerRequest(c) {
			return c.Next()
		}

		authToken := ""
		if cfg != nil {
			authToken = strings.TrimSpace(cfg.App.AuthToken)
		}

		if c.Method() == http.MethodPost && c.Path() == authExchangePath {
			return handleAuthExchange(c, webSessionRepo, authToken)
		}

		sessionID := c.Cookies(sessionCookieName)
		if sessionID != "" {
			if _, err := webSessionRepo.Get(c.Context(), sessionID); err == nil {
				if err := webSessionRepo.TouchLastSeenDebounced(c.Context(), sessionID, sessionTouchInterval); err != nil {
					return response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
				}

				setOwner(c, sessionID)

				return c.Next()
			}
		}

		if authToken != "" {
			return response.ErrorBuilder().FromError(apperror.Unauthenticated()).Send(c)
		}

		newSessionID, err := webSessionRepo.Create(c.Context())
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

		setOwner(c, newSessionID)

		return c.Next()
	}
}

// handleAuthExchange swaps the deployment auth token for a session cookie.
// The token is never persisted; the plain session ID is returned only to the
// caller that presented the token.
func handleAuthExchange(c fiber.Ctx, webSessionRepo repository.IWebSessionRepo, authToken string) error {
	if authToken == "" {
		return response.ErrorBuilder().FromError(apperror.NotFound(apperror.ErrAuthNotEnabled)).Send(c)
	}

	var req authExchangeRequest
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(apperror.ErrUnauthenticated)).Send(c)
	}

	if subtle.ConstantTimeCompare([]byte(req.Token), []byte(authToken)) != 1 {
		return response.ErrorBuilder().FromError(apperror.Unauthenticated()).Send(c)
	}

	sessionID, err := webSessionRepo.Create(c.Context())
	if err != nil {
		return response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
	}

	c.Cookie(&fiber.Cookie{
		Name:     sessionCookieName,
		Value:    sessionID,
		Path:     "/",
		HTTPOnly: true,
		SameSite: "Lax",
		Secure:   c.Protocol() == "https",
	})

	setOwner(c, sessionID)

	return response.SuccessBuilder().Send(c)
}

func setOwner(c fiber.Ctx, ownerID string) {
	c.Locals(helper.CtxOwnerIDKey, ownerID)
	c.SetContext(helper.CtxWithOwnerID(c.Context(), ownerID))
}

func isBearerRequest(c fiber.Ctx) bool {
	return strings.HasPrefix(c.Path(), mcpProxyPrefix) &&
		strings.HasPrefix(c.Get("Authorization"), "Bearer ")
}
