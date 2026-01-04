package database

import (
	"context"
	"fmt"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseMysql "github.com/dbo-studio/dbo/internal/database/mysql"
	databasePostgres "github.com/dbo-studio/dbo/internal/database/postgres"
	databaseSqlite "github.com/dbo-studio/dbo/internal/database/sqlite"
	"github.com/dbo-studio/dbo/internal/model"
)

func NewDatabaseRepository(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager) (databaseContract.DatabaseRepository, error) {
	switch connection.ConnectionType {
	case string(databaseContract.Mysql):
		return databaseMysql.NewMySQLRepository(ctx, connection, cm)
	case string(databaseContract.Postgresql):
		return databasePostgres.NewPostgresRepository(ctx, connection, cm)
	case string(databaseContract.Sqlite):
		return databaseSqlite.NewSQLiteRepository(ctx, connection, cm)
	//case "sqlserver":
	//	return databaseSqlserver.NewSQLServerRepository(connection, cm)
	default:
		return nil, fmt.Errorf("unsupported database type: %s", connection.ConnectionType)
	}
}
