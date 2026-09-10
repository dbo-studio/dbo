package database

import (
	"context"
	"fmt"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	databaseMysql "github.com/dbo-studio/dbo/internal/database/mysql"
	databasePostgres "github.com/dbo-studio/dbo/internal/database/postgres"
	databaseSqlite "github.com/dbo-studio/dbo/internal/database/sqlite"
	"github.com/dbo-studio/dbo/internal/model"
)

func NewDatabaseRepository(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager) (databaseContract.DatabaseRepository, error) {
	deps := databaseCore.DriverDeps{Cache: cm.Cache(), Logger: cm.Logger()}

	switch connection.ConnectionType {
	case string(databaseContract.Mysql):
		return databaseMysql.NewMySQLRepository(ctx, connection, cm, deps)
	case string(databaseContract.Postgresql):
		return databasePostgres.NewPostgresRepository(ctx, connection, cm, deps)
	case string(databaseContract.Sqlite):
		return databaseSqlite.NewSQLiteRepository(ctx, connection, cm, deps)
	default:
		return nil, fmt.Errorf("unsupported database type: %s", connection.ConnectionType)
	}
}

func NewAIContextRepository(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager) (databaseContract.AIContextRepository, error) {
	return NewDatabaseRepository(ctx, connection, cm)
}

func NewDBToolsRepository(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager) (databaseContract.DBToolsRepository, error) {
	return NewDatabaseRepository(ctx, connection, cm)
}
