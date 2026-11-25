package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"

	"gorm.io/gorm"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
)

type ServerPanel struct {
	Columns []string `json:"columns"`
	Rows    [][]any  `json:"rows"`
}

type ServerCapabilities struct {
	Panels         []string `json:"panels"`
	ActivityAction string   `json:"activityAction,omitempty"`
}

type serverQueries struct {
	status, activity, databases, users string
	action                             string
}

func queriesForServer(engine string) serverQueries {
	switch {
	case contract.IsPostgresFamily(engine):
		return serverQueries{
			status:    `SELECT current_setting('server_version'), EXTRACT(EPOCH FROM clock_timestamp() - pg_postmaster_start_time())::bigint, (SELECT count(*) FROM pg_stat_activity WHERE backend_type = 'client backend')`,
			activity:  `SELECT pid AS "ID", datname AS "Database", usename AS "User", state AS "State", left(query, 512) AS "Query", CASE WHEN state = 'active' THEN concat(backend_start::text, '/', query_start::text) END AS "Target" FROM pg_stat_activity WHERE backend_type = 'client backend' AND pid <> pg_backend_pid() ORDER BY pid`,
			databases: `SELECT datname AS "Database", pg_catalog.pg_get_userbyid(datdba) AS "Owner" FROM pg_catalog.pg_database WHERE NOT datistemplate ORDER BY datname`,
			users:     `SELECT rolname AS "User", rolsuper AS "Superuser" FROM pg_catalog.pg_roles WHERE rolcanlogin ORDER BY rolname`,
			action:    "cancel-query",
		}
	case contract.IsMysqlFamily(engine):
		return serverQueries{
			status:    `SELECT VERSION(), @@hostname, @@max_connections`,
			activity:  `SELECT ID, USER AS Account, DB AS DatabaseName, COMMAND AS Command, TIME AS Seconds, LEFT(INFO, 512) AS Statement, IF(COMMAND IN ('Query','Execute') AND INFO IS NOT NULL, SHA2(CONCAT_WS('|', USER, HOST, DB, INFO), 256), NULL) AS Target FROM information_schema.PROCESSLIST WHERE ID <> CONNECTION_ID() ORDER BY ID`,
			databases: `SHOW DATABASES`,
			users:     `SELECT User AS Account, Host AS Host FROM mysql.user ORDER BY User, Host`,
			action:    "cancel-query",
		}
	case engine == contract.SQLServer:
		return serverQueries{
			status:    `SELECT CONVERT(nvarchar(128), SERVERPROPERTY('ProductVersion')), CONVERT(nvarchar(128), SERVERPROPERTY('ServerName')), CONVERT(nvarchar(128), SERVERPROPERTY('Edition'))`,
			activity:  `SELECT session_id AS ID, login_name AS [User], host_name AS Host, status AS State, CONVERT(varchar(30), login_time, 126) AS Target FROM sys.dm_exec_sessions WHERE is_user_process = 1 AND session_id <> @@SPID ORDER BY session_id`,
			databases: `SELECT name AS [Database], state_desc AS State FROM sys.databases ORDER BY name`,
			users:     `SELECT name AS [User], type_desc AS Type FROM sys.server_principals WHERE type IN ('S', 'U', 'G', 'E', 'X') ORDER BY name`,
			action:    "end-session",
		}
	case engine == contract.ClickHouse:
		return serverQueries{
			status:    `SELECT version(), hostName(), uptime()`,
			activity:  `SELECT query_id AS ID, user AS User, elapsed AS Seconds, left(query, 512) AS Statement, toString(cityHash64(user, query)) AS Target FROM system.processes WHERE query_id <> currentQueryID() ORDER BY elapsed DESC`,
			databases: `SELECT name AS Database, engine AS Engine FROM system.databases ORDER BY name`,
			users:     `SELECT name AS User FROM system.users ORDER BY name`,
			action:    "cancel-query",
		}
	case engine == contract.Sqlite:
		return serverQueries{status: `SELECT sqlite_version()`, databases: `PRAGMA database_list`}
	default:
		return serverQueries{}
	}
}

func GetServerCapabilities(engine string) ServerCapabilities {
	q := queriesForServer(engine)

	out := ServerCapabilities{Panels: []string{}, ActivityAction: q.action}
	if contract.IsRedisFamily(engine) {
		out.ActivityAction = "disconnect-client"
	}

	if q.status != "" || contract.IsRedisFamily(engine) {
		out.Panels = append(out.Panels, "status")
	}

	if q.activity != "" || contract.IsRedisFamily(engine) {
		out.Panels = append(out.Panels, "operations")
	}

	if q.databases != "" || contract.IsRedisFamily(engine) {
		out.Panels = append(out.Panels, "databases")
	}

	if q.users != "" || contract.IsRedisFamily(engine) {
		out.Panels = append(out.Panels, "users")
	}

	return out
}

func ReadServerPanel(ctx context.Context, conn *model.Connection, cm *databaseConnection.ConnectionManager, panel string) (*ServerPanel, error) {
	if contract.IsRedisFamily(conn.ConnectionType) {
		driver, err := NewNoSQLRepository(ctx, conn, cm)
		if err != nil {
			return nil, err
		}

		columns, rows, err := driver.(redisServerTools).ServerInfo(ctx, panel)

		return &ServerPanel{Columns: columns, Rows: rows}, err
	}

	q := queriesForServer(conn.ConnectionType)

	statement := map[string]string{"status": q.status, "operations": q.activity, "databases": q.databases, "users": q.users}[panel]
	if statement == "" {
		return nil, errors.New("server panel is unavailable")
	}

	db, err := cm.GetConnection(ctx, conn, true)
	if err != nil {
		return nil, err
	}

	rows, err := db.WithContext(ctx).Raw(statement).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out, err := scanServerRows(rows)
	if err != nil || panel != "status" || len(out.Rows) == 0 {
		return out, err
	}

	labels := []string{"version"}

	switch {
	case contract.IsPostgresFamily(conn.ConnectionType):
		labels = append(labels, "uptime", "connections")
	case contract.IsMysqlFamily(conn.ConnectionType):
		labels = append(labels, "host", "maxConnections")
	case conn.ConnectionType == contract.SQLServer:
		labels = append(labels, "host", "edition")
	case conn.ConnectionType == contract.ClickHouse:
		labels = append(labels, "host", "uptime")
	}

	facts := &ServerPanel{Columns: []string{"Metric", "Value"}, Rows: make([][]any, len(labels))}
	for index, label := range labels {
		facts.Rows[index] = []any{label, out.Rows[0][index]}
	}

	return facts, nil
}

func scanServerRows(rows *sql.Rows) (*ServerPanel, error) {
	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	out := &ServerPanel{Columns: columns, Rows: [][]any{}}
	for len(out.Rows) < 1000 && rows.Next() {
		values := make([]any, len(columns))

		targets := make([]any, len(columns))
		for idx := range targets {
			targets[idx] = &values[idx]
		}

		if err := rows.Scan(targets...); err != nil {
			return nil, err
		}

		for idx, value := range values {
			if b, ok := value.([]byte); ok {
				values[idx] = string(b)
			}
		}

		out.Rows = append(out.Rows, values)
	}

	return out, rows.Err()
}

type redisServerTools interface {
	ServerInfo(context.Context, string) ([]string, [][]any, error)
	DisconnectClient(context.Context, string, string) error
}

func EndServerActivity(ctx context.Context, conn *model.Connection, cm *databaseConnection.ConnectionManager, id, target string) error {
	if id == "" || target == "" {
		return errors.New("invalid activity target")
	}

	if contract.IsRedisFamily(conn.ConnectionType) {
		driver, err := NewNoSQLRepository(ctx, conn, cm)
		if err != nil {
			return err
		}

		return driver.(redisServerTools).DisconnectClient(ctx, id, target)
	}

	db, err := cm.GetConnection(ctx, conn, true)
	if err != nil {
		return err
	}

	db = db.WithContext(ctx)

	engine := conn.ConnectionType
	if engine == contract.ClickHouse {
		// The driver binds both fields as values. The predicate also rules out a stale
		// record if a client reuses a query ID for a different statement.
		result, err := db.Raw(`KILL QUERY WHERE query_id = ? AND toString(cityHash64(user, query)) = ? AND query_id <> currentQueryID() SYNC`, id, target).Rows()
		if err != nil {
			return err
		}
		defer result.Close()

		if !result.Next() {
			if err := result.Err(); err != nil {
				return err
			}

			return errors.New("activity target is no longer active")
		}

		var status string

		columns, err := result.Columns()
		if err != nil {
			return err
		}

		fields := make([]any, len(columns))
		for index := range fields {
			fields[index] = new(any)
		}

		fields[0] = &status
		if err := result.Scan(fields...); err != nil {
			return err
		}

		if status != "finished" {
			return fmt.Errorf("cancel query: %s", status)
		}

		return nil
	}

	pid, err := strconv.ParseUint(id, 10, 32)
	if err != nil || pid == 0 {
		return errors.New("invalid activity target")
	}

	switch {
	case contract.IsPostgresFamily(engine):
		var canceled bool

		err = db.Raw(`SELECT COALESCE((
			SELECT pg_cancel_backend(pid) FROM pg_stat_activity
			WHERE pid = ? AND backend_type = 'client backend' AND pid <> pg_backend_pid()
				AND concat(backend_start::text, '/', query_start::text) = ? AND state = 'active'
		), false)`, pid, target).Row().Scan(&canceled)
		if err != nil {
			return err
		}

		if !canceled {
			return errors.New("activity target is no longer active or cannot be canceled")
		}

		return nil
	case contract.IsMysqlFamily(engine):
		return killSQLSession(db, `SELECT COUNT(*) FROM information_schema.PROCESSLIST WHERE ID = ? AND ID <> CONNECTION_ID()
			AND COMMAND IN ('Query','Execute') AND INFO IS NOT NULL AND SHA2(CONCAT_WS('|', USER, HOST, DB, INFO), 256) = ?`, "KILL QUERY ", pid, target)
	case engine == contract.SQLServer:
		return killSQLSession(db, `SELECT COUNT(*) FROM sys.dm_exec_sessions WHERE session_id = ? AND session_id <> @@SPID
			AND is_user_process = 1 AND CONVERT(varchar(30), login_time, 126) = ?`, "KILL ", pid, target)
	default:
		return errors.New("activity management is unavailable")
	}
}

// Pin the check and the native command to the same physical session so the
// self-session filter applies to the command as well.
func killSQLSession(db *gorm.DB, selection, command string, id uint64, target string) error {
	return db.Connection(func(session *gorm.DB) error {
		var count int
		if err := session.Raw(selection, id, target).Row().Scan(&count); err != nil {
			return err
		}

		if count != 1 {
			return errors.New("activity target is no longer active")
		}

		return session.Exec(command + strconv.FormatUint(id, 10)).Error
	})
}
