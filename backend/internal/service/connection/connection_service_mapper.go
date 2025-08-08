package serviceConnection

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/goccy/go-json"
	"github.com/tidwall/sjson"
)

func connectionsToResponse(connections *[]model.Connection) *dto.ConnectionsResponse {
	data := make([]dto.Connection, 0)
	for _, c := range *connections {
		options, _ := sjson.Set(c.Options, "password", "")
		var j map[string]any
		_ = json.Unmarshal([]byte(options), &j)

		data = append(data, dto.Connection{
			ID:       int64(c.ID),
			Name:     c.Name,
			Icon:     c.ConnectionType,
			IsActive: c.IsActive,
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

func connectionDetailModelToResponse(c *model.Connection) *dto.ConnectionDetailResponse {
	options, _ := sjson.Set(c.Options, "password", "")
	var j map[string]any
	_ = json.Unmarshal([]byte(options), &j)

	return &dto.ConnectionDetailResponse{
		ID:       int64(c.ID),
		Name:     c.Name,
		Icon:     c.ConnectionType,
		IsActive: c.IsActive,
		Type:     c.ConnectionType,
		Info:     connectionInfo(c),
		Options:  j,
	}
}
