package serviceConnection

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/model"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	"github.com/goccy/go-json"
	"github.com/tidwall/sjson"
)

func connectionsToResponse(ctx context.Context, ownerID string, cm *databaseConnection.ConnectionManager, unlock *serviceSafemode.UnlockStore, connections *[]model.Connection) *dto.ConnectionsResponse {
	data := make([]dto.Connection, 0)
	for _, c := range *connections {
		data = append(data, connectionToResponse(ctx, ownerID, cm, unlock, &c))
	}

	return &dto.ConnectionsResponse{
		Connections: data,
	}
}

func connectionToResponse(ctx context.Context, ownerID string, cm *databaseConnection.ConnectionManager, unlock *serviceSafemode.UnlockStore, connection *model.Connection) dto.Connection {
	options, _ := sjson.Set(connection.Options, "password", "")
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

	return dto.Connection{
		ID:                  int64(connection.ID),
		Name:                connection.Name,
		Icon:                connection.ConnectionType,
		IsActive:            connection.IsActive,
		IsOpen:              isOpen,
		Type:                connection.ConnectionType,
		Info:                connectionInfo(connection),
		Options:             j,
		SafeMode:            string(connection.SafeMode),
		SafeModeUnlocked:    policy.Unlocked,
		SafeModeUnlockUntil: unlockUntil,
	}
}

func connectionInfo(connection *model.Connection) string {
	switch connection.ConnectionType {
	case "postgresql":
		return fmt.Sprintf("%s | %s %s :  SQL Query", connection.Name, connection.ConnectionType, *connection.Version)
	case "mysql":
		return "mysql"
	case "sqlite":
		return fmt.Sprintf("%s | %s %s :  SQL Query", connection.Name, connection.ConnectionType, *connection.Version)
	case "sqlserver":
		return "sqlserver"
	default:
		return "unknown"
	}
}
