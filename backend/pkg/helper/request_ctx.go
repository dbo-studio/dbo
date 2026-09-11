package helper

import (
	"context"

	"github.com/dbo-studio/dbo/pkg/apperror"
)

type ctxKey string

const (
	CtxOwnerIDKey            ctxKey = "dbo.owner_id"
	CtxSessionIDKey          ctxKey = "dbo.session_id"
	CtxUserIDKey             ctxKey = "dbo.user_id"
	CtxUserRoleKey           ctxKey = "dbo.user_role"
	CtxMustChangePasswordKey ctxKey = "dbo.must_change_password"
	CtxConnectionPasswordKey ctxKey = "dbo.connection_password"
)

func CtxOwnerID(ctx context.Context) string {
	v := ctx.Value(CtxOwnerIDKey)
	if v == nil {
		return "desktop"
	}

	if s, ok := v.(string); ok {
		return s
	}

	return "desktop"
}

func CtxWithOwnerID(ctx context.Context, ownerID string) context.Context {
	return context.WithValue(ctx, CtxOwnerIDKey, ownerID)
}

func CtxSessionID(ctx context.Context) string {
	v := ctx.Value(CtxSessionIDKey)
	if v == nil {
		return ""
	}

	if s, ok := v.(string); ok {
		return s
	}

	return ""
}

func CtxWithSessionID(ctx context.Context, sessionID string) context.Context {
	return context.WithValue(ctx, CtxSessionIDKey, sessionID)
}

func CtxUserID(ctx context.Context) string {
	v := ctx.Value(CtxUserIDKey)
	if v == nil {
		return ""
	}

	if s, ok := v.(string); ok {
		return s
	}

	return ""
}

func CtxWithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, CtxUserIDKey, userID)
}

func CtxUserRole(ctx context.Context) string {
	v := ctx.Value(CtxUserRoleKey)
	if v == nil {
		return ""
	}

	if s, ok := v.(string); ok {
		return s
	}

	return ""
}

func CtxWithUserRole(ctx context.Context, role string) context.Context {
	return context.WithValue(ctx, CtxUserRoleKey, role)
}

// RequireInstanceAdmin allows the call when there is no user principal (desktop
// / anonymous). Logged-in web users must be admins.
func RequireInstanceAdmin(ctx context.Context) error {
	if CtxUserID(ctx) == "" {
		return nil
	}

	if CtxUserRole(ctx) != "admin" {
		return apperror.Forbidden(apperror.ErrAdminRequired)
	}

	return nil
}

func CtxMustChangePassword(ctx context.Context) bool {
	v := ctx.Value(CtxMustChangePasswordKey)
	if v == nil {
		return false
	}

	b, ok := v.(bool)

	return ok && b
}

func CtxWithMustChangePassword(ctx context.Context, must bool) context.Context {
	return context.WithValue(ctx, CtxMustChangePasswordKey, must)
}

func CtxWithConnectionPassword(ctx context.Context, password string) context.Context {
	return context.WithValue(ctx, CtxConnectionPasswordKey, password)
}

func CtxConnectionPassword(ctx context.Context) (string, bool) {
	v := ctx.Value(CtxConnectionPasswordKey)
	if v == nil {
		return "", false
	}

	s, ok := v.(string)
	if !ok || s == "" {
		return "", false
	}

	return s, true
}
