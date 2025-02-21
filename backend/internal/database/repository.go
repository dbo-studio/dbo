package database

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseMysql "github.com/dbo-studio/dbo/internal/database/mysql"
	databasePostgres "github.com/dbo-studio/dbo/internal/database/postgres"
	databaseSqlite "github.com/dbo-studio/dbo/internal/database/sqlite"
	databaseSqlserver "github.com/dbo-studio/dbo/internal/database/sqlserver"
)

func NewDatabaseRepository(dbType, connID string, cm *databaseConnection.ConnectionManager) (databaseContract.DatabaseRepository, error) {
	switch dbType {
	case "mysql":
		return databaseMysql.NewMySQLRepository(connID, cm)
	case "postgres":
		return databasePostgres.NewPostgresRepository(connID, cm)
	case "sqlite":
		return databaseSqlite.NewSQLiteRepository(connID, cm)
	case "sqlserver":
		return databaseSqlserver.NewSQLServerRepository(connID, cm)
	default:
		return nil, fmt.Errorf("unsupported database type: %s", dbType)
	}
}
