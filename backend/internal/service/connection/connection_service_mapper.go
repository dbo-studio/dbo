package serviceConnection

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/samber/lo"
)

func connectionsToResponse(connections *[]model.Connection) *dto.ConnectionsResponse {
	data := make([]dto.Connection, 0)
	for _, c := range *connections {
		data = append(data, dto.Connection{
			ID:       int64(c.ID),
			Name:     c.Name,
			Type:     "SQL",
			Driver:   c.ConnectionType,
			IsActive: c.IsActive,
			Auth: dto.AuthDetails{
				Database: lo.ToPtr(c.Database.String),
				Host:     c.Host,
				Port:     c.Port,
				Username: c.Username,
			},
		})
	}

	return &dto.ConnectionsResponse{
		Connections: data,
	}
}

func connectionDetailModelToResponse(connection *model.Connection) *dto.ConnectionDetailResponse {
	return &dto.ConnectionDetailResponse{
		ID:       int64(connection.ID),
		Name:     connection.Name,
		Type:     "SQL",
		Driver:   connection.ConnectionType,
		IsActive: connection.IsActive,
		Auth: dto.AuthDetails{
			Database: lo.ToPtr(connection.Database.String),
			Host:     connection.Host,
			Port:     connection.Port,
			Username: connection.Username,
		},
	}
}
