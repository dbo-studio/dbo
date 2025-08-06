package database

import (
	"fmt"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databasePostgres "github.com/dbo-studio/dbo/internal/database/postgres"
	databaseSqlite "github.com/dbo-studio/dbo/internal/database/sqlite"
	"github.com/dbo-studio/dbo/internal/model"
)

func NewDatabaseRepository(connection *model.Connection, cm *databaseConnection.ConnectionManager) (databaseContract.DatabaseRepository, error) {
	switch connection.ConnectionType {
	//case "mysql":
	//	return databaseMysql.NewMySQLRepository(connection, cm)
	case string(databaseContract.Postgresql):
		return databasePostgres.NewPostgresRepository(connection, cm)
	case string(databaseContract.Sqlite):
		return databaseSqlite.NewSQLiteRepository(connection, cm)
	//case "sqlserver":
	//	return databaseSqlserver.NewSQLServerRepository(connection, cm)
	default:
		return nil, fmt.Errorf("unsupported database type: %s", connection.ConnectionType)
	}
}
