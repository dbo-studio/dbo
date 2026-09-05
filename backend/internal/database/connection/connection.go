package databaseConnection

import (
	"context"
	"fmt"
	"sync"
	"time"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
)

type IConnectionManager interface {
	IsOpen(ctx context.Context, ownerID string, connectionID uint) bool
	Close(ctx context.Context, ownerID string, connectionID uint) error
	CloseDatabase(ctx context.Context, ownerID string, connectionID uint, databaseName string) error
	ListOpen(ownerID string) []uint
}

type conn struct {
	DB       *gorm.DB
	LastUsed time.Time
}

type connKey struct {
	OwnerID      string
	ConnectionID uint
	Database     string
}

type HistoryWriter interface {
	Create(ctx context.Context, connectionID uint, query string, isSystem bool) error
}

// PasswordHydrator resolves stored connection passwords. Declared here (not
// imported from the service layer) so the database stack never depends
// upward; the secret store satisfies it implicitly.
type PasswordHydrator interface {
	GetConnectionPassword(ctx context.Context, ownerID string, connectionID uint) (string, error)
}

type ConnectionManager struct {
	connections map[connKey]*conn
	mu          sync.Mutex
	logger      logger.Logger
	historyRepo HistoryWriter
	secrets     PasswordHydrator
	safetyTTL   time.Duration
}

func NewConnectionManager(historyRepo HistoryWriter, secrets PasswordHydrator, appLogger logger.Logger) *ConnectionManager {
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

// pingCached pings an existing entry outside the manager mutex: a slow or
// hung database host must not block every other connection operation.
// Returns true if the entry is still healthy.
func (cm *ConnectionManager) pingCached(ctx context.Context, entry *conn) bool {
	sqlDB, err := entry.DB.DB()
	if err != nil {
		return false
	}

	if err := sqlDB.PingContext(ctx); err != nil {
		return false
	}

	cm.mu.Lock()
	entry.LastUsed = time.Now()
	cm.mu.Unlock()

	return true
}

// dropIfCurrent removes a dead entry from the map only if it is still the one
// we probed, so a concurrent reconnect is never deleted by mistake.
func (cm *ConnectionManager) dropIfCurrent(key connKey, entry *conn) {
	cm.mu.Lock()
	if cur, ok := cm.connections[key]; ok && cur == entry {
		delete(cm.connections, key)
		cm.mu.Unlock()
		_ = cm.closeConn(entry)

		return
	}
	cm.mu.Unlock()
}

func (cm *ConnectionManager) GetConnection(ctx context.Context, connection *model.Connection, withHydration bool) (*gorm.DB, error) {
	ownerID := helper.CtxOwnerID(ctx)
	key := connKey{OwnerID: ownerID, ConnectionID: connection.ID}

	cm.mu.Lock()
	entry, exists := cm.connections[key]
	cm.mu.Unlock()

	if exists && cm.pingCached(ctx, entry) {
		return entry.DB, nil
	}

	if exists {
		cm.dropIfCurrent(key, entry)
	}

	// Hydration and the actual connect happen without holding cm.mu — a hung
	// host must not serialize every other connection operation.
	if cm.secrets != nil && withHydration {
		if err := hydrateConnectionPassword(ctx, cm.secrets, ownerID, connection); err != nil {
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
		return nil, apperror.DriverError(err)
	}

	if err := configureConnPool(db); err != nil {
		_ = cm.closeConn(&conn{DB: db})

		return nil, apperror.DriverError(err)
	}

	RegisterHistoryHooks(db, cm.historyRepo, connection.ID)

	cm.mu.Lock()
	// Another request may have connected concurrently; keep the existing
	// entry and discard ours.
	if existing, ok := cm.connections[key]; ok {
		cm.mu.Unlock()
		_ = cm.closeConn(&conn{DB: db})

		return existing.DB, nil
	}

	cm.connections[key] = &conn{
		DB:       db,
		LastUsed: time.Now(),
	}
	cm.mu.Unlock()

	return db, nil
}

func configureConnPool(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}

	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	return nil
}

func (cm *ConnectionManager) GetConnectionForDatabase(ctx context.Context, connection *model.Connection, databaseName string, withHydration bool) (*gorm.DB, error) {
	if connection.ConnectionType != string(databaseContract.Postgresql) || databaseName == "" {
		return cm.GetConnection(ctx, connection, withHydration)
	}

	defaultDatabase := DefaultPostgresqlDatabase(connection)
	if databaseName == defaultDatabase {
		return cm.GetConnection(ctx, connection, withHydration)
	}

	ownerID := helper.CtxOwnerID(ctx)
	key := connKey{OwnerID: ownerID, ConnectionID: connection.ID, Database: databaseName}

	cm.mu.Lock()
	entry, exists := cm.connections[key]
	cm.mu.Unlock()

	if exists && cm.pingCached(ctx, entry) {
		return entry.DB, nil
	}

	if exists {
		cm.dropIfCurrent(key, entry)
	}

	if cm.secrets != nil && withHydration {
		if err := hydrateConnectionPassword(ctx, cm.secrets, ownerID, connection); err != nil {
			return nil, err
		}
	}

	dialect := OpenPostgresqlConnectionForDatabase(connection, databaseName)
	if dialect == nil {
		return nil, fmt.Errorf("failed to open postgresql connection for database %q", databaseName)
	}

	db, err := gorm.Open(dialect, &gorm.Config{})
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	if err := configureConnPool(db); err != nil {
		_ = cm.closeConn(&conn{DB: db})

		return nil, apperror.DriverError(err)
	}

	RegisterHistoryHooks(db, cm.historyRepo, connection.ID)

	cm.mu.Lock()
	if existing, ok := cm.connections[key]; ok {
		cm.mu.Unlock()
		_ = cm.closeConn(&conn{DB: db})

		return existing.DB, nil
	}

	cm.connections[key] = &conn{
		DB:       db,
		LastUsed: time.Now(),
	}
	cm.mu.Unlock()

	return db, nil
}

func (cm *ConnectionManager) IsOpen(ctx context.Context, ownerID string, connectionID uint) bool {
	key := connKey{OwnerID: ownerID, ConnectionID: connectionID}

	cm.mu.Lock()
	entry, ok := cm.connections[key]
	cm.mu.Unlock()

	if !ok {
		return false
	}

	if !cm.pingCached(ctx, entry) {
		cm.dropIfCurrent(key, entry)

		return false
	}

	return true
}

func (cm *ConnectionManager) Close(_ context.Context, ownerID string, connectionID uint) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	for key, c := range cm.connections {
		if key.OwnerID == ownerID && key.ConnectionID == connectionID {
			delete(cm.connections, key)
			_ = cm.closeConn(c)
		}
	}

	return nil
}

func (cm *ConnectionManager) CloseDatabase(_ context.Context, ownerID string, connectionID uint, databaseName string) error {
	if databaseName == "" {
		return nil
	}

	cm.mu.Lock()
	defer cm.mu.Unlock()

	for key, c := range cm.connections {
		if key.OwnerID == ownerID && key.ConnectionID == connectionID && key.Database == databaseName {
			delete(cm.connections, key)
			_ = cm.closeConn(c)
		}
	}

	return nil
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
		// Collect stale entries under the lock, close their pools outside of
		// it — Close() can block on sockets held by a hung host.
		cm.mu.Lock()
		stale := make([]*conn, 0, len(cm.connections))

		for key, conn := range cm.connections {
			if time.Since(conn.LastUsed) <= cm.safetyTTL {
				continue
			}

			hasActiveSessions := func() bool {
				db, err := conn.DB.DB()

				return err == nil && db.Stats().InUse > 0
			}

			if hasActiveSessions() {
				conn.LastUsed = time.Now()
				continue
			}

			delete(cm.connections, key)

			stale = append(stale, conn)
		}
		cm.mu.Unlock()

		for _, c := range stale {
			if err := cm.closeConn(c); err != nil {
				cm.logger.Error(fmt.Errorf("failed to close inactive connection: %w", err))
			}
		}
	}
}

// hydrateConnectionPassword injects the connection password into
// connection.Options when needed: SQLite needs none, an existing password
// wins, a context-provided password comes next, then the secret store.
func hydrateConnectionPassword(ctx context.Context, store PasswordHydrator, ownerID string, connection *model.Connection) error {
	if connection == nil || connection.ConnectionType == "sqlite" {
		return nil
	}

	if connection.Options != "" && gjson.Get(connection.Options, "password").String() != "" {
		return nil
	}

	if p, ok := helper.CtxConnectionPassword(ctx); ok {
		return setConnectionPassword(connection, p)
	}

	password, err := store.GetConnectionPassword(ctx, ownerID, connection.ID)
	if err != nil {
		return err
	}

	return setConnectionPassword(connection, password)
}

func setConnectionPassword(connection *model.Connection, password string) error {
	options, err := sjson.Set(connection.Options, "password", password)
	if err != nil {
		return err
	}

	connection.Options = options

	return nil
}

func (cm *ConnectionManager) closeConn(c *conn) error {
	if c == nil || c.DB == nil {
		return nil
	}

	db, err := c.DB.DB()
	if err != nil {
		return err
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
		err := historyRepo.Create(db.Statement.Context, connectionID, db.Dialector.Explain(db.Statement.SQL.String(), db.Statement.Vars...), true)
		if err != nil {
			db.Logger.Error(db.Statement.Context, "failed to save query history: %v", err)
		}
	}

	err := cb.Query().After("gorm:after_query").Register("custom:save_history_query", saveHistory)
	if err != nil {
		db.Logger.Error(db.Statement.Context, "failed to save query history: %v", err)
	}
}
