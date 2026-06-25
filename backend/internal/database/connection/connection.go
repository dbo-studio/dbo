package databaseConnection

import (
	"context"
	"fmt"
	"sync"
	"time"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	secretStore "github.com/dbo-studio/dbo/internal/service/secret_store"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
)

type IConnectionManager interface {
	IsOpen(ctx context.Context, ownerID string, connectionID uint) bool
	Close(ctx context.Context, ownerID string, connectionID uint) error
	ListOpen(ownerID string) []uint
}

type conn struct {
	DB       *gorm.DB
	LastUsed time.Time
}

type connKey struct {
	OwnerID      string
	ConnectionID uint
}

type HistoryWriter interface {
	Create(ctx context.Context, connectionID uint, query string) error
}

type ConnectionManager struct {
	connections map[connKey]*conn
	mu          sync.Mutex
	logger      logger.Logger
	historyRepo HistoryWriter
	secrets     secretStore.ISecretStore
	safetyTTL   time.Duration
}

func NewConnectionManager(historyRepo HistoryWriter, secrets secretStore.ISecretStore, appLogger logger.Logger) *ConnectionManager {
	cm := &ConnectionManager{
		connections: make(map[connKey]*conn),
		mu:          sync.Mutex{},
		logger:      appLogger,
		historyRepo: historyRepo,
		secrets:     secrets,
		safetyTTL:   6 * time.Hour,
	}
	go cm.cleanupInactiveConnections()
	return cm
}

func (cm *ConnectionManager) GetConnection(ctx context.Context, connection *model.Connection, withHydration bool) (*gorm.DB, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	ownerID := helper.CtxOwnerID(ctx)
	key := connKey{OwnerID: ownerID, ConnectionID: connection.ID}

	if conn, exists := cm.connections[key]; exists {
		db, err := conn.DB.DB()
		if err == nil {
			if err := db.PingContext(ctx); err == nil {
				conn.LastUsed = time.Now()
				return conn.DB, nil
			}
		}
		delete(cm.connections, key)
		_ = cm.closeConn(conn)
	}

	// Ensure connection has password when needed.
	if cm.secrets != nil && withHydration {
		if err := secretStore.HydrateConnectionPassword(ctx, cm.secrets, ownerID, connection); err != nil {
			return nil, err
		}
	}

	var dialect gorm.Dialector
	switch connection.ConnectionType {
	case string(databaseContract.Mysql):
		dialect = OpenMysqlConnection(connection)
	case string(databaseContract.Postgresql):
		dialect = OpenPostgresqlConnection(connection)
	case string(databaseContract.Sqlite):
		dialect = OpenSQLiteConnection(connection)
	case "sqlserver":
		dialect = sqlserver.Open(connection.Name)
	default:
		cm.logger.Error(fmt.Errorf("unsupported database type: %s", connection.ConnectionType))
		return nil, fmt.Errorf("unsupported database type: %s", connection.ConnectionType)
	}

	db, err := gorm.Open(dialect, &gorm.Config{})
	if err != nil {
		return nil, err
	}

	RegisterHistoryHooks(db, cm.historyRepo, connection.ID)

	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	cm.connections[key] = &conn{
		DB:       db,
		LastUsed: time.Now(),
	}
	return db, nil
}

func (cm *ConnectionManager) IsOpen(ctx context.Context, ownerID string, connectionID uint) bool {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	key := connKey{OwnerID: ownerID, ConnectionID: connectionID}
	c, ok := cm.connections[key]
	if !ok {
		return false
	}

	sqlDB, err := c.DB.DB()
	if err != nil {
		delete(cm.connections, key)
		return false
	}
	if err := sqlDB.PingContext(ctx); err != nil {
		delete(cm.connections, key)
		_ = cm.closeConn(c)
		return false
	}

	return true
}

func (cm *ConnectionManager) Close(_ context.Context, ownerID string, connectionID uint) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	key := connKey{OwnerID: ownerID, ConnectionID: connectionID}
	c, ok := cm.connections[key]
	if !ok {
		return nil
	}
	delete(cm.connections, key)
	return cm.closeConn(c)
}

func (cm *ConnectionManager) ListOpen(ownerID string) []uint {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	out := make([]uint, 0)
	for k := range cm.connections {
		if k.OwnerID == ownerID {
			out = append(out, k.ConnectionID)
		}
	}
	return out
}

func (cm *ConnectionManager) cleanupInactiveConnections() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		cm.mu.Lock()
		for key, conn := range cm.connections {
			if time.Since(conn.LastUsed) <= cm.safetyTTL {
				continue
			}

			db, err := conn.DB.DB()
			if err == nil {
				if db.Stats().InUse > 0 {
					conn.LastUsed = time.Now()
					continue
				}
			}

			delete(cm.connections, key)
			_ = cm.closeConn(conn)
		}
		cm.mu.Unlock()
	}
}

func (cm *ConnectionManager) closeConn(c *conn) error {
	if c == nil || c.DB == nil {
		return nil
	}
	db, err := c.DB.DB()
	if err != nil {
		return nil
	}
	return db.Close()
}

func RegisterHistoryHooks(db *gorm.DB, historyRepo HistoryWriter, connectionID uint) {
	cb := db.Callback()

	saveHistory := func(db *gorm.DB) {
		if db.Statement == nil || db.Statement.SQL.String() == "" {
			return
		}

		if db.Statement.Table == "histories" {
			return
		}

		//nolint
		err := historyRepo.Create(db.Statement.Context, connectionID, db.Dialector.Explain(db.Statement.SQL.String(), db.Statement.Vars...))
		if err != nil {
			db.Logger.Error(db.Statement.Context, "failed to save query history: %v", err)
		}
	}

	err := cb.Query().After("gorm:after_query").Register("custom:save_history_query", saveHistory)
	if err != nil {
		db.Logger.Error(db.Statement.Context, "failed to save query history: %v", err)
	}
}
