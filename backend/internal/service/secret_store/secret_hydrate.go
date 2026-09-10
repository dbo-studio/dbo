package serviceSecretStore

import (
	"context"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

// HydrateConnectionPassword injects the connection password into connection.Options when needed.
// It checks, in order: SQLite (skip), existing password in Options, context-provided password, then secret store.
func HydrateConnectionPassword(ctx context.Context, store ISecretStore, ownerID string, connection *model.Connection) error {
	if connection == nil {
		return nil
	}

	if connection.ConnectionType == "sqlite" {
		return nil
	}

	if connection.Options != "" {
		if gjson.Get(connection.Options, "password").String() != "" {
			return nil
		}
	}

	if p, ok := helper.CtxConnectionPassword(ctx); ok {
		options, err := sjson.Set(connection.Options, "password", p)
		if err != nil {
			return err
		}

		connection.Options = options

		return nil
	}

	password, err := store.GetConnectionPassword(ctx, ownerID, connection.ID)
	if err != nil {
		return err
	}

	options, err := sjson.Set(connection.Options, "password", password)
	if err != nil {
		return err
	}

	connection.Options = options

	return nil
}
