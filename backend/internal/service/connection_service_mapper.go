package service

import (
	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/model"
)

func connectionModelToConnectionDetailResponse(connection *model.Connection, version string, databases []string, schemas []string, tables []string) *dto.ConnectionDetailResponse {
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
			Port:     int(connection.Port),
		},
		Databases: databases,
		Schemas:   schemas,
		Tables:    tables,
	}
}
