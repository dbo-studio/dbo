package databaseConnection

import (
	"fmt"
	"sync"
	"time"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/logger"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlserver"

	"gorm.io/driver/sqlite"
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
}

func NewConnectionManager(logger logger.Logger) *ConnectionManager {
	cm := &ConnectionManager{
		connections: make(map[uint]*conn),
		mu:          sync.Mutex{},
		logger:      logger,
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
	case "sqlite":
		dialect = sqlite.Open(connection.Name)
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
