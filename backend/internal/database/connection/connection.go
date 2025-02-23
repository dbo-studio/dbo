package databaseConnection

import (
	"fmt"
	"sync"
	"time"

	"github.com/dbo-studio/dbo/pkg/logger"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlserver"

	// درایور SQLite
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type ConnectionInfo struct {
	ID               string `json:"id"`
	DBType           string `json:"db_type"`
	ConnectionString string `json:"connection_string"`
}

type Connection struct {
	DB       *gorm.DB
	LastUsed time.Time
}

type ConnectionManager struct {
	connections map[string]*Connection
	mu          sync.Mutex
	logger      logger.Logger
}

func NewConnectionManager(logger logger.Logger) *ConnectionManager {
	cm := &ConnectionManager{
		connections: make(map[string]*Connection),
		mu:          sync.Mutex{},
		logger:      logger,
	}
	go cm.cleanupInactiveConnections()
	return cm
}

func (cm *ConnectionManager) GetConnection(connInfo ConnectionInfo) (*gorm.DB, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if conn, exists := cm.connections[connInfo.ID]; exists {
		db, err := conn.DB.DB()
		if err == nil {
			if err := db.Ping(); err == nil { // تست اتصال با GORM
				conn.LastUsed = time.Now()
				return conn.DB, nil
			}
		}
		cm.logger.Error(err)
		delete(cm.connections, connInfo.ID)
	}

	var dialect gorm.Dialector
	switch connInfo.DBType {
	case "mysql":
		dialect = mysql.Open(connInfo.ConnectionString)
	case "postgresql":
		dialect = postgres.Open(connInfo.ConnectionString)
	case "sqlite":
		dialect = sqlite.Open(connInfo.ConnectionString)
	case "sqlserver":
		dialect = sqlserver.Open(connInfo.ConnectionString)
	default:
		cm.logger.Error(fmt.Errorf("unsupported database type: %s", connInfo.DBType))
		return nil, fmt.Errorf("unsupported database type: %s", connInfo.DBType)
	}

	db, err := gorm.Open(dialect, &gorm.Config{})
	if err != nil {
		return nil, err
	}

	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	cm.connections[connInfo.ID] = &Connection{
		DB:       db,
		LastUsed: time.Now(),
	}
	return db, nil
}

func GetConnectionInfoFromDB(connID string) ConnectionInfo {
	// منطق واقعی برای گرفتن از دیتابیس محلی
	return ConnectionInfo{
		ID:               connID,
		DBType:           "postgres",
		ConnectionString: "host=localhost user=default password=secret dbname=default port=5432 sslmode=disable",
	}
}

func (cm *ConnectionManager) cleanupInactiveConnections() {
	ticker := time.NewTicker(10 * time.Second) // هر ۱۰ ثانیه چک می‌کنه
	defer ticker.Stop()

	for range ticker.C {
		cm.mu.Lock()
		for id, conn := range cm.connections {
			if time.Since(conn.LastUsed) > 30*time.Second { // بیشتر از ۳۰ ثانیه غیرفعال
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
