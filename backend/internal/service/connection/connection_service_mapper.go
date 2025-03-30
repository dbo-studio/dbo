package serviceConnection

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
)

func connectionsToResponse(connections *[]model.Connection) *dto.ConnectionsResponse {
	data := make([]dto.Connection, 0)
	for _, c := range *connections {
		data = append(data, dto.Connection{
			ID:       int64(c.ID),
			Name:     c.Name,
			Icon:     c.ConnectionType,
			Info:     connectionInfo(&c),
			IsActive: c.IsActive,
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
		return "sqlite"
	case "sqlserver":
		return "sqlserver"
	default:
		return "unknown"
	}
}

func connectionDetailModelToResponse(c *model.Connection) *dto.ConnectionDetailResponse {
	return &dto.ConnectionDetailResponse{
		ID:       int64(c.ID),
		Name:     c.Name,
		Icon:     c.ConnectionType,
		Info:     connectionInfo(c),
		IsActive: c.IsActive,
		// Auth: dto.AuthDetails{
		// 	Database: lo.ToPtr(c.Database.String),
		// 	Host:     c.Host,
		// 	Port:     c.Port,
		// 	Username: c.Username,
		// },
	}
}
