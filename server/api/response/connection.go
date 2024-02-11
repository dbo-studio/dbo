package response

import (
	"github.com/khodemobin/dbo/model"
)

type connectionsInfo struct {
	ID     int64       `json:"id"`
	Name   string      `json:"name"`
	Type   string      `json:"type"`
	Driver string      `json:"driver"`
	Auth   authDetails `json:"auth"`
}

type connectionInfo struct {
	ID              int64       `json:"id"`
	Name            string      `json:"name"`
	Type            string      `json:"type"`
	Driver          string      `json:"driver"`
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
}

func Connections(connections []model.Connection) any {
	var data []connectionsInfo
	for _, c := range connections {
		data = append(data, connectionsInfo{
			ID:     int64(c.ID),
			Name:   c.Name,
			Type:   "SQL",
			Driver: "PostgreSQL",
			Auth: authDetails{
				Database: c.Database,
				Host:     c.Host,
				Port:     int(c.Port),
			},
		})
	}

	return data
}

func Connection(connection model.Connection, databases []string, schemas []string, currentDb string, currentSchema string, tables []string) any {
	return connectionInfo{
		ID:              int64(connection.ID),
		Name:            connection.Name,
		Type:            "SQL",
		Driver:          "PostgreSQL",
		CurrentDatabase: currentDb,
		CurrentSchema:   currentSchema,
		Auth: authDetails{
			Database: connection.Database,
			Host:     connection.Host,
			Port:     int(connection.Port),
		},
		Databases: databases,
		Schemas:   schemas,
		Tables:    tables,
	}
}
