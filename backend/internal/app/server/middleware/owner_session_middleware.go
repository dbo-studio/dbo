package middleware

import (
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceAuth "github.com/dbo-studio/dbo/internal/service/auth"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

const (
	sessionTouchInterval = 60 * time.Second
	mcpProxyPrefix       = "/api/mcp"
	healthzPath          = "/healthz"
	apiPrefix            = "/api"
)

func OwnerSessionMiddleware(
	cfg *config.Config,
	webSessionRepo repository.IWebSessionRepo,
	authService serviceAuth.IAuthService,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		if cfg != nil && cfg.App.Client == config.ClientDesktop {
			setOwner(c, "desktop")

			return c.Next()
		}

		path := c.Path()

		if path == healthzPath {
			return c.Next()
		}

		// SPA / static assets: no auth. Data APIs live under /api.
		if !strings.HasPrefix(path, apiPrefix) {
			return c.Next()
		}

		if isMcpProxyBearer(c) {
			return c.Next()
		}

		mode := config.AuthModeNone
		if cfg != nil {
			mode = cfg.App.AuthMode
		}

		publicURL := ""
		if cfg != nil {
			publicURL = cfg.App.PublicURL
		}

		// Login / token exchange: no session required.
		if isUnauthOnlyPath(c.Method(), path) {
			return c.Next()
		}

		bound, err := tryBindCookieSession(c, webSessionRepo, authService, mode, publicURL)
		if err != nil {
			return err
		}

		// Status is always reachable; return whatever identity we bound.
		if path == "/api/auth/status" && c.Method() == http.MethodGet {
			return c.Next()
		}

		if bound {
			if helper.CtxMustChangePassword(c.Context()) && !isMustChangeAllowed(c.Method(), path) {
				return response.ErrorBuilder().FromError(apperror.MustChangePassword()).Send(c)
			}

			return c.Next()
		}

		switch mode {
		case config.AuthModeLocal:
			return response.ErrorBuilder().FromError(apperror.Unauthenticated()).Send(c)
		default:
			newSessionID, createErr := webSessionRepo.Create(c.Context())
			if createErr != nil {
				return response.ErrorBuilder().FromError(apperror.InternalServerError(createErr)).Send(c)
			}

			SetSessionCookie(c, newSessionID, publicURL)
			setOwner(c, newSessionID)
			setSessionID(c, newSessionID)

			return c.Next()
		}
	}
}

func tryBindCookieSession(
	c fiber.Ctx,
	webSessionRepo repository.IWebSessionRepo,
	authService serviceAuth.IAuthService,
	mode config.AuthMode,
	publicURL string,
) (bool, error) {
	sessionID := c.Cookies(serviceAuth.SessionCookieName)
	if sessionID == "" {
		sessionID = c.Cookies(serviceAuth.LegacyCookieName)
	}

	if sessionID == "" {
		return false, nil
	}

	session, err := webSessionRepo.Get(c.Context(), sessionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}

		return false, response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
	}

	if authService.SessionExpired(session, time.Now().UTC()) {
		_ = webSessionRepo.Delete(c.Context(), sessionID)
		ClearSessionCookies(c, publicURL)

		return false, nil
	}

	user, userErr := authService.LoadSessionUser(c.Context(), session)
	if userErr != nil {
		if errors.Is(userErr, apperror.ErrUserDisabled) || errors.Is(userErr, apperror.ErrUserNotFound) {
			_ = webSessionRepo.Delete(c.Context(), sessionID)
			ClearSessionCookies(c, publicURL)

			return false, nil
		}

		return false, response.ErrorBuilder().FromError(apperror.InternalServerError(userErr)).Send(c)
	}

	if mode == config.AuthModeLocal && user == nil {
		// Local mode requires a user-bound session.
		_ = webSessionRepo.Delete(c.Context(), sessionID)
		ClearSessionCookies(c, publicURL)

		return false, nil
	}

	if err := webSessionRepo.TouchLastSeenDebounced(c.Context(), sessionID, sessionTouchInterval); err != nil {
		return false, response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
	}

	bindSession(c, session, user)

	return true, nil
}

func isUnauthOnlyPath(method, path string) bool {
	return path == "/api/auth/login" && method == http.MethodPost
}

func isMustChangeAllowed(method, path string) bool {
	if path == "/api/auth/status" && method == http.MethodGet {
		return true
	}

	if path == "/api/auth/password" && method == http.MethodPost {
		return true
	}

	if path == "/api/auth/logout" && method == http.MethodPost {
		return true
	}

	return false
}

func bindSession(c fiber.Ctx, session *model.WebSession, user *model.User) {
	setSessionID(c, session.ID)

	if user != nil {
		setUser(c, user)
		setOwner(c, user.ID)

		return
	}

	setOwner(c, session.ID)
}

func setOwner(c fiber.Ctx, ownerID string) {
	c.Locals(helper.CtxOwnerIDKey, ownerID)
	c.SetContext(helper.CtxWithOwnerID(c.Context(), ownerID))
}

func setSessionID(c fiber.Ctx, sessionID string) {
	c.Locals(helper.CtxSessionIDKey, sessionID)
	c.SetContext(helper.CtxWithSessionID(c.Context(), sessionID))
}

func setUser(c fiber.Ctx, user *model.User) {
	c.Locals(helper.CtxUserIDKey, user.ID)
	c.Locals(helper.CtxUserRoleKey, string(user.Role))
	c.Locals(helper.CtxMustChangePasswordKey, user.MustChangePassword)
	ctx := helper.CtxWithUserID(c.Context(), user.ID)
	ctx = helper.CtxWithUserRole(ctx, string(user.Role))
	ctx = helper.CtxWithMustChangePassword(ctx, user.MustChangePassword)
	c.SetContext(ctx)
}

func cookieSecure(c fiber.Ctx, publicURL string) bool {
	if u, err := url.Parse(strings.TrimSpace(publicURL)); err == nil && strings.EqualFold(u.Scheme, "https") {
		return true
	}

	return c.Protocol() == "https"
}

// SetSessionCookie writes the HttpOnly session cookie and clears the legacy name.
func SetSessionCookie(c fiber.Ctx, sessionID string, publicURL string) {
	secure := cookieSecure(c, publicURL)
	c.Cookie(&fiber.Cookie{
		Name:     serviceAuth.SessionCookieName,
		Value:    sessionID,
		Path:     "/",
		HTTPOnly: true,
		SameSite: "Lax",
		Secure:   secure,
	})
	c.Cookie(&fiber.Cookie{
		Name:     serviceAuth.LegacyCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HTTPOnly: true,
		SameSite: "Lax",
		Secure:   secure,
	})
}

// ClearSessionCookies expires session cookies.
func ClearSessionCookies(c fiber.Ctx, publicURL string) {
	secure := cookieSecure(c, publicURL)
	c.Cookie(&fiber.Cookie{
		Name:     serviceAuth.SessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HTTPOnly: true,
		SameSite: "Lax",
		Secure:   secure,
	})
	c.Cookie(&fiber.Cookie{
		Name:     serviceAuth.LegacyCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HTTPOnly: true,
		SameSite: "Lax",
		Secure:   secure,
	})
}

// isMcpProxyBearer skips cookie auth only for the MCP tool proxy, not management APIs.
func isMcpProxyBearer(c fiber.Ctx) bool {
	if !strings.HasPrefix(c.Get("Authorization"), "Bearer ") {
		return false
	}

	path := c.Path()
	if !strings.HasPrefix(path, mcpProxyPrefix) {
		return false
	}

	switch path {
	case "/api/mcp/status", "/api/mcp/update", "/api/mcp/regenerate-token":
		return false
	default:
		return true
	}
}
