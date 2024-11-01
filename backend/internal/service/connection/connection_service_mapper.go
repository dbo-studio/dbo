package serviceConnection

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
)

func connectionsToResponse(connections *[]model.Connection) *dto.ConnectionsResponse {
	data := make([]dto.Connection, 0)
	for _, c := range *connections {
		data = append(data, dto.Connection{
			ID:       int64(c.ID),
			Name:     c.Name,
			Type:     "SQL",
			Driver:   "PostgreSQL",
			IsActive: c.IsActive,
			Auth: dto.AuthDetails{
				Database: c.Database,
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

func connectionDetailModelToResponse(connection *model.Connection, version string, databases []string, schemas []string, tables []string) *dto.ConnectionDetailResponse {
	return &dto.ConnectionDetailResponse{
		ID:              int64(connection.ID),
		Name:            connection.Name,
		Type:            "SQL",
		Driver:          "PostgreSQL",
		Version:         version,
		IsActive:        connection.IsActive,
		CurrentDatabase: connection.CurrentDatabase.String,
		CurrentSchema:   connection.CurrentSchema.String,
		Auth: dto.AuthDetails{
			Database: connection.Database,
			Host:     connection.Host,
			Username: connection.Username,
			Port:     connection.Port,
		},
		Databases: databases,
		Schemas:   schemas,
		Tables:    tables,
	}
}
