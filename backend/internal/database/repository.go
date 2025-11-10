package database

import (
	"context"
	"fmt"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databasePostgres "github.com/dbo-studio/dbo/internal/database/postgres"
	databaseSqlite "github.com/dbo-studio/dbo/internal/database/sqlite"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/cache"
)

func NewDatabaseRepository(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager, cache cache.Cache) (databaseContract.DatabaseRepository, error) {
	switch connection.ConnectionType {
	//case "mysql":
	//	return databaseMysql.NewMySQLRepository(connection, cm)
	case string(databaseContract.Postgresql):
		return databasePostgres.NewPostgresRepository(ctx, connection, cm, cache)
	case string(databaseContract.Sqlite):
		return databaseSqlite.NewSQLiteRepository(ctx, connection, cm, cache)
	//case "sqlserver":
	//	return databaseSqlserver.NewSQLServerRepository(connection, cm)
	default:
		return nil, fmt.Errorf("unsupported database type: %s", connection.ConnectionType)
	}
}
