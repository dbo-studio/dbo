package response

import (
	"github.com/khodemobin/dbo/model"
)

type connectionsInfo struct {
	ID       int64       `json:"id"`
	Name     string      `json:"name"`
	Type     string      `json:"type"`
	Driver   string      `json:"driver"`
	Auth     authDetails `json:"auth"`
	IsActive bool        `json:"is_active"`
}

type connectionInfo struct {
	ID              int64       `json:"id"`
	Name            string      `json:"name"`
	Type            string      `json:"type"`
	Driver          string      `json:"driver"`
	IsActive        bool        `json:"is_active"`
	CurrentDatabase string      `json:"current_database"`
	CurrentSchema   string      `json:"current_schema"`
	Auth            authDetails `json:"auth"`
	Databases       []string    `json:"databases"`
	Schemas         []string    `json:"schemas"`
	Tables          []string    `json:"tables"`
}

type authDetails struct {
	Database string `json:"database"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
}

func Connections(connections []model.Connection) any {
	var data []connectionsInfo
	for _, c := range connections {
		data = append(data, connectionsInfo{
			ID:       int64(c.ID),
			Name:     c.Name,
			Type:     "SQL",
			Driver:   "PostgreSQL",
			IsActive: c.IsActive,
			Auth: authDetails{
				Database: c.Database,
				Host:     c.Host,
				Port:     int(c.Port),
				Username: c.Username,
			},
		})
	}

	return data
}

func Connection(connection *model.Connection, databases []string, schemas []string, tables []string) any {
	return connectionInfo{
		ID:              int64(connection.ID),
		Name:            connection.Name,
		Type:            "SQL",
		Driver:          "PostgreSQL",
		IsActive:        connection.IsActive,
		CurrentDatabase: connection.CurrentDatabase.String,
		CurrentSchema:   connection.CurrentSchema.String,
		Auth: authDetails{
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
