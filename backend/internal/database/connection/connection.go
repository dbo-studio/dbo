package databaseConnection

import (
	"database/sql"
	"sync"
	"time"

	_ "github.com/denisenkom/go-mssqldb" // درایور SQL Server
	_ "github.com/go-sql-driver/mysql"   // درایور MySQL
	_ "github.com/lib/pq"                // درایور PostgreSQL
	_ "github.com/mattn/go-sqlite3"      // درایور SQLite
)

type ConnectionInfo struct {
	ID               string `json:"id"`
	DBType           string `json:"db_type"`
	ConnectionString string `json:"connection_string"`
}

type Connection struct {
	DB       *sql.DB
	LastUsed time.Time
}

type ConnectionManager struct {
	Connections map[string]*Connection
	Mutex       sync.Mutex
}

func NewConnectionManager() *ConnectionManager {
	cm := &ConnectionManager{
		Connections: make(map[string]*Connection),
		Mutex:       sync.Mutex{},
	}
	go cm.cleanupInactiveConnections()
	return cm
}

func (cm *ConnectionManager) GetConnection(connInfo ConnectionInfo) (*sql.DB, error) {
	cm.Mutex.Lock()
	defer cm.Mutex.Unlock()

	if conn, exists := cm.Connections[connInfo.ID]; exists {
		if err := conn.DB.Ping(); err == nil {
			conn.LastUsed = time.Now()
			return conn.DB, nil
		}
		delete(cm.Connections, connInfo.ID)
	}

	db, err := sql.Open(connInfo.DBType, connInfo.ConnectionString)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	cm.Connections[connInfo.ID] = &Connection{
		DB:       db,
		LastUsed: time.Now(),
	}
	return db, nil
}

func (cm *ConnectionManager) CloseConnection(connID string) error {
	cm.Mutex.Lock()
	defer cm.Mutex.Unlock()

	if conn, exists := cm.Connections[connID]; exists {
		err := conn.DB.Close()
		delete(cm.Connections, connID)
		return err
	}
	return nil
}

func (cm *ConnectionManager) CloseAll() {
	cm.Mutex.Lock()
	defer cm.Mutex.Unlock()

	for id, conn := range cm.Connections {
		conn.DB.Close()
		delete(cm.Connections, id)
	}
}

func (cm *ConnectionManager) cleanupInactiveConnections() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		cm.Mutex.Lock()
		for id, conn := range cm.Connections {
			if time.Since(conn.LastUsed) > 30*time.Second {
				conn.DB.Close()
				delete(cm.Connections, id)
			}
		}
		cm.Mutex.Unlock()
	}
}

func GetConnectionInfoFromDB(connID string) ConnectionInfo {
	// منطق واقعی برای گرفتن از دیتابیس محلی
	return ConnectionInfo{
		ID:               connID,
		DBType:           "postgres",
		ConnectionString: "user=default password=secret dbname=default port=5432 sslmode=disable",
	}
}
