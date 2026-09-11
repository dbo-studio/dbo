package helper

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

const (
	PermCreateConnection = "create_connection"
	PermAiSettings       = "ai_settings"
	PermMcpSettings      = "mcp_settings"
)

type ctxKeyPermissions struct{}

func CtxWithPermissions(ctx context.Context, perms dto.UserPermissions) context.Context {
	return context.WithValue(ctx, ctxKeyPermissions{}, perms)
}

func CtxPermissions(ctx context.Context) (dto.UserPermissions, bool) {
	v := ctx.Value(ctxKeyPermissions{})
	if v == nil {
		return dto.UserPermissions{}, false
	}

	perms, ok := v.(dto.UserPermissions)

	return perms, ok
}

func HasPermission(ctx context.Context, perm string) bool {
	if CtxUserID(ctx) == "" {
		return true
	}

	perms, ok := CtxPermissions(ctx)
	if !ok {
		return CtxUserRole(ctx) == "admin"
	}

	switch perm {
	case PermCreateConnection:
		return perms.CreateConnection
	case PermAiSettings:
		return perms.AiSettings
	case PermMcpSettings:
		return perms.McpSettings
	default:
		return false
	}
}

func RequirePermission(ctx context.Context, perm string) error {
	if HasPermission(ctx, perm) {
		return nil
	}

	return apperror.Forbidden(apperror.ErrPermissionDenied)
}
