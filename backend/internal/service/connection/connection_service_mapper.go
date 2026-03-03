package serviceConnection

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/goccy/go-json"
	"github.com/tidwall/sjson"
)

func connectionsToResponse(ctx context.Context, ownerID string, cm *databaseConnection.ConnectionManager, connections *[]model.Connection) *dto.ConnectionsResponse {
	data := make([]dto.Connection, 0)
	for _, c := range *connections {
		options, _ := sjson.Set(c.Options, "password", "")
		var j map[string]any
		_ = json.Unmarshal([]byte(options), &j)

		isOpen := false
		if cm != nil {
			isOpen = cm.IsOpen(ctx, ownerID, c.ID)
		}

		data = append(data, dto.Connection{
			ID:       int64(c.ID),
			Name:     c.Name,
			Icon:     c.ConnectionType,
			IsActive: c.IsActive,
			IsOpen:   isOpen,
			Type:     c.ConnectionType,
			Info:     connectionInfo(&c),
			Options:  j,
		})
	}

	return &dto.ConnectionsResponse{
		Connections: data,
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
