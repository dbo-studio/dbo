package middleware

import (
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/tidwall/gjson"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/repository"
	secretStore "github.com/dbo-studio/dbo/internal/service/secret_store"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/response"
)

/**
This middleware is used to check if the connection password is required for the request.
If the connection password is required, it will return a 401 error.
*/

func ConnectionPasswordMiddleware(connectionRepo repository.IConnectionRepo, cm databaseConnection.IConnectionManager, ss secretStore.ISecretStore) fiber.Handler {
	return func(c fiber.Ctx) error {
		if strings.HasSuffix(c.Path(), "/credentials") && c.Method() == "POST" {
			return c.Next()
		}

		connectionID, ok := extractConnectionID(c)
		if !ok || connectionID <= 0 {
			return c.Next()
		}

		ownerID := helper.CtxOwnerID(c)
		if ownerID == "" {
			return c.Next()
		}

		if cm.IsOpen(c.Context(), ownerID, uint(connectionID)) {
			return c.Next()
		}

		conn, err := connectionRepo.FindByIDAndOwner(c.Context(), int32(connectionID), ownerID)
		if err != nil || conn == nil {
			return c.Next()
		}

		if conn.ConnectionType == "sqlite" {
			return c.Next()
		}

		_, err = ss.GetConnectionPassword(c.Context(), ownerID, conn.ID)
		if err != nil {
			if err := connectionRepo.MakeAllConnectionsNotDefault(c.Context(), nil); err != nil {
				return response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
			}

			if errors.Is(err, secretStore.ErrSecretNotFound) {
				return response.ErrorBuilder().
					FromError(apperror.PasswordRequired()).
					WithData(map[string]interface{}{"connectionId": conn.ID}).
					Send(c)
			}

			return response.ErrorBuilder().FromError(apperror.InternalServerError(err)).Send(c)
		}

		return c.Next()
	}
}

func extractConnectionID(c fiber.Ctx) (int64, bool) {
	route := c.Route()

	println(route)
	if v := c.Params("id"); v != "" {
		if id, err := strconv.ParseInt(v, 10, 64); err == nil {
			return id, true
		}
	}

	if v := c.Query("connectionId"); v != "" {
		if id, err := strconv.ParseInt(v, 10, 64); err == nil {
			return id, true
		}
	}

	if body := c.Body(); len(body) > 0 {
		if gjson.ValidBytes(body) {
			v := gjson.GetBytes(body, "connectionId").String()
			if v != "" {
				if id, err := strconv.ParseInt(v, 10, 64); err == nil {
					return id, true
				}
			}
		}
	}

	if v := c.FormValue("connectionId"); v != "" {
		if id, err := strconv.ParseInt(v, 10, 64); err == nil {
			return id, true
		}
	}

	return 0, false
}
