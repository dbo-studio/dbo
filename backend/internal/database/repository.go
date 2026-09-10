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

	switch {
	case databaseContract.IsMysqlFamily(connection.ConnectionType):
		return databaseMysql.NewMySQLRepository(ctx, connection, cm, deps)
	case databaseContract.IsPostgresFamily(connection.ConnectionType):
		return databasePostgres.NewPostgresRepository(ctx, connection, cm, deps)
	case connection.ConnectionType == string(databaseContract.Sqlite):
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
