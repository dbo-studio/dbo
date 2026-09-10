package middleware

import (
	"crypto/sha256"
	"crypto/subtle"
	"errors"
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
	"gorm.io/gorm"
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

func OwnerSessionMiddleware(cfg *config.Config, webSessionRepo repository.IWebSessionRepo) fiber.Handler {
	return func(c fiber.Ctx) error {
		if cfg != nil && cfg.App.Client == config.ClientDesktop {
			setOwner(c, "desktop")

			return c.Next()
		}

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
			_, err := webSessionRepo.Get(c.Context(), sessionID)
			if err == nil {
				if err := webSessionRepo.TouchLastSeenDebounced(c.Context(), sessionID, sessionTouchInterval); err != nil {
					return response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
				}

				setOwner(c, sessionID)

				return c.Next()
			}

			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
			}
		}

		if authToken != "" {
			return response.ErrorBuilder().FromError(apperror.Unauthenticated()).Send(c)
		}

		newSessionID, err := webSessionRepo.Create(c.Context())
		if err != nil {
			return response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
		}

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

func handleAuthExchange(c fiber.Ctx, webSessionRepo repository.IWebSessionRepo, authToken string) error {
	if authToken == "" {
		return response.ErrorBuilder().FromError(apperror.NotFound(apperror.ErrAuthNotEnabled)).Send(c)
	}

	var req authExchangeRequest
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(apperror.ErrUnauthenticated)).Send(c)
	}

	if !authTokensEqual(req.Token, authToken) {
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

func authTokensEqual(provided, expected string) bool {
	h1 := sha256.Sum256([]byte(provided))
	h2 := sha256.Sum256([]byte(expected))

	return subtle.ConstantTimeCompare(h1[:], h2[:]) == 1
}

func setOwner(c fiber.Ctx, ownerID string) {
	c.Locals(helper.CtxOwnerIDKey, ownerID)
	c.SetContext(helper.CtxWithOwnerID(c.Context(), ownerID))
}

func isBearerRequest(c fiber.Ctx) bool {
	return strings.HasPrefix(c.Path(), mcpProxyPrefix) &&
		strings.HasPrefix(c.Get("Authorization"), "Bearer ")
}
