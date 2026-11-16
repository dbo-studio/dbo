package helper

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func CtxWithPermissions(ctx context.Context, perms dto.UserPermissions) context.Context {
	return context.WithValue(ctx, CtxPermissionsKey, perms)
}

func CtxPermissions(ctx context.Context) (dto.UserPermissions, bool) {
	v := ctx.Value(CtxPermissionsKey)
	if v == nil {
		return nil, false
	}

	perms, ok := v.(dto.UserPermissions)

	return perms, ok
}

// HasPermission reports whether the caller may use a feature (a key from package permission). A call
// with no signed-in user (desktop, or login turned off) is open.
func HasPermission(ctx context.Context, perm string) bool {
	if CtxUserID(ctx) == "" {
		return true
	}

	perms, ok := CtxPermissions(ctx)
	if !ok {
		return CtxUserRole(ctx) == "admin"
	}

	return perms[perm]
}

func RequirePermission(ctx context.Context, perm string) error {
	if HasPermission(ctx, perm) {
		return nil
	}

	return apperror.Forbidden(apperror.ErrPermissionDenied)
}
