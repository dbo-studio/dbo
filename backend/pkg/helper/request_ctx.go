package helper

import "context"

type ctxKey string

const (
	CtxOwnerIDKey            ctxKey = "dbo.owner_id"
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
