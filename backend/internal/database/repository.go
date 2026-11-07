package database

import (
	"context"
	"fmt"
	"sync"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	databaseMongo "github.com/dbo-studio/dbo/internal/database/mongo"
	databaseMysql "github.com/dbo-studio/dbo/internal/database/mysql"
	databaseNoSQLFixture "github.com/dbo-studio/dbo/internal/database/nosqlfixture"
	databasePostgres "github.com/dbo-studio/dbo/internal/database/postgres"
	databaseRedis "github.com/dbo-studio/dbo/internal/database/redis"
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

var (
	fixtureOnce sync.Once
	redisOnce   sync.Once
	mongoOnce   sync.Once
	fixtureRepo *databaseNoSQLFixture.Repository
)

// NewNoSQLRepository returns the driver for a NoSQL connection type. NewDatabaseRepository
// keeps rejecting these types, so SQL code paths never see a NoSQL connection.
func NewNoSQLRepository(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager) (databaseContract.NoSQLRepository, error) {
	switch {
	case connection.ConnectionType == databaseContract.NoSQLFixture:
		if !databaseContract.NoSQLFixtureEnabled() {
			return nil, fmt.Errorf("unsupported nosql type: %s", connection.ConnectionType)
		}

		// The fixture is in-memory, so every request must share one instance to see its own writes.
		fixtureOnce.Do(func() { fixtureRepo = databaseNoSQLFixture.New() })

		return fixtureRepo, nil
	case databaseContract.IsRedisFamily(connection.ConnectionType):
		redisOnce.Do(func() { databaseRedis.Register(cm) })

		return databaseRedis.New(ctx, connection, cm)
	case databaseContract.IsMongo(connection.ConnectionType):
		mongoOnce.Do(func() { databaseMongo.Register(cm) })

		return databaseMongo.New(ctx, connection, cm)
	default:
		return nil, fmt.Errorf("unsupported nosql type: %s", connection.ConnectionType)
	}
}

// NewTreeRepository returns the SQL or NoSQL driver for a connection, for callers that only need Version and Tree.
func NewTreeRepository(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager) (databaseContract.TreeRepository, error) {
	if databaseContract.IsNoSQL(connection.ConnectionType) {
		return NewNoSQLRepository(ctx, connection, cm)
	}

	return NewDatabaseRepository(ctx, connection, cm)
}
