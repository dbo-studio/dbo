package databaseConnection

import (
	"fmt"
	"sync"
	"time"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/logger"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlserver"

	"gorm.io/gorm"
)

type conn struct {
	DB       *gorm.DB
	LastUsed time.Time
}

type ConnectionManager struct {
	connections map[uint]*conn
	mu          sync.Mutex
	logger      logger.Logger
	historyRepo repository.IHistoryRepo
}

func NewConnectionManager(logger logger.Logger, historyRepo repository.IHistoryRepo) *ConnectionManager {
	cm := &ConnectionManager{
		connections: make(map[uint]*conn),
		mu:          sync.Mutex{},
		logger:      logger,
		historyRepo: historyRepo,
	}
	go cm.cleanupInactiveConnections()
	return cm
}

func (cm *ConnectionManager) GetConnection(connection *model.Connection) (*gorm.DB, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if conn, exists := cm.connections[connection.ID]; exists {
		db, err := conn.DB.DB()
		if err == nil {
			if err := db.Ping(); err == nil {
				conn.LastUsed = time.Now()
				return conn.DB, nil
			}
		}
		cm.logger.Error(err)
		delete(cm.connections, connection.ID)
	}

	var dialect gorm.Dialector
	switch connection.ConnectionType {
	case string(databaseContract.Mysql):
		dialect = mysql.Open(connection.Name)
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

	cm.connections[connection.ID] = &conn{
		DB:       db,
		LastUsed: time.Now(),
	}
	return db, nil
}

func (cm *ConnectionManager) cleanupInactiveConnections() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		cm.mu.Lock()
		for id, conn := range cm.connections {
			if time.Since(conn.LastUsed) > 30*time.Second {
				delete(cm.connections, id)
				db, err := conn.DB.DB()
				if err == nil {
					err = db.Close()
					if err != nil {
						cm.logger.Error(err)
						return
					}
				}

				cm.logger.Error(err)
			}
		}
		cm.mu.Unlock()
	}
}

func RegisterHistoryHooks(db *gorm.DB, historyRepo repository.IHistoryRepo, connectionID uint) {
	cb := db.Callback()

	saveHistory := func(db *gorm.DB) {
		if db.Statement == nil || db.Statement.SQL.String() == "" {
			return
		}

		if db.Statement.Table == "histories" {
			return
		}

		err := historyRepo.Create(db.Statement.Context, connectionID, db.Dialector.Explain(db.Statement.SQL.String(), db.Statement.Vars...))
		if err != nil {
			db.Logger.Error(db.Statement.Context, "failed to save query history: %v", err)
		}

		if err != nil {
			db.Logger.Error(db.Statement.Context, "failed to save query history: %v", err)
		}
	}

	err := cb.Query().After("gorm:after_query").Register("custom:save_history_query", saveHistory)
	if err != nil {
		db.Logger.Error(db.Statement.Context, "failed to save query history: %v", err)
	}
}
