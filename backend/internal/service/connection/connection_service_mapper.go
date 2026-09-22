package serviceConnection

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	"github.com/goccy/go-json"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

type connectionView struct {
	access         string
	passwordShared bool
}

func connectionsToResponse(ctx context.Context, ownerID string, cm *databaseConnection.ConnectionManager, unlock *serviceSafemode.UnlockStore, connections *[]model.Connection, views map[uint]connectionView) *dto.ConnectionsResponse {
	data := make([]dto.Connection, 0)
	for _, c := range *connections {
		data = append(data, connectionToResponse(ctx, ownerID, cm, unlock, &c, views[c.ID]))
	}

	return &dto.ConnectionsResponse{
		Connections: data,
	}
}

func connectionToResponse(ctx context.Context, ownerID string, cm *databaseConnection.ConnectionManager, unlock *serviceSafemode.UnlockStore, connection *model.Connection, view connectionView) dto.Connection {
	options, _ := sjson.Set(connection.Options, "password", "")
	if uri := gjson.Get(options, "uri").String(); uri != "" {
		if cleaned, _, stripErr := databaseConnection.StripURIPassword(uri); stripErr == nil && cleaned != uri {
			options, _ = sjson.Set(options, "uri", cleaned)
		}
	}

	var j map[string]any

	_ = json.Unmarshal([]byte(options), &j)

	isOpen := false
	if cm != nil {
		isOpen = cm.IsOpen(ctx, ownerID, connection.ID)
	}

	policy := serviceSafemode.FromConnection(connection)
	if unlock != nil {
		policy = unlock.WithUnlock(ctx, ownerID, connection.ID, policy)
	}

	var unlockUntil *string

	if policy.UnlockedUntil != nil {
		formatted := policy.UnlockedUntil.UTC().Format(time.RFC3339)
		unlockUntil = &formatted
	}

	access := view.access
	if access == "" {
		if connection.OwnerID == ownerID {
			access = "owner"
		} else {
			access = model.ConnectionShareViewer
		}
	}

	return dto.Connection{
		ID:                  int64(connection.ID),
		Name:                connection.Name,
		Icon:                connection.ConnectionType,
		IsActive:            connection.IsActive,
		IsOpen:              isOpen,
		Type:                connection.ConnectionType,
		Info:                connectionInfo(connection),
		Options:             j,
		SafeMode:            string(policy.Mode),
		SafeModeUnlocked:    policy.Unlocked,
		SafeModeUnlockUntil: unlockUntil,
		Access:              access,
		Shared:              access != "owner",
		PasswordShared:      view.passwordShared,
	}
}

func connectionInfo(connection *model.Connection) string {
	switch {
	case databaseContract.IsPostgresFamily(connection.ConnectionType),
		databaseContract.IsMysqlFamily(connection.ConnectionType),
		connection.ConnectionType == "sqlite",
		connection.ConnectionType == "sqlserver":
		version := ""
		if connection.Version != nil {
			version = *connection.Version
		}

		return fmt.Sprintf("%s | %s %s :  SQL Query", connection.Name, connection.ConnectionType, version)
	default:
		return "unknown"
	}
}
