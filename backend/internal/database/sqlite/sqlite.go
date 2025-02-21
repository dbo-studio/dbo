package databaseSqlite

import (
	"database/sql"

	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

type SQLiteRepository struct {
	db     *sql.DB
	connID string
	cm     *databaseConnection.ConnectionManager
}

func NewSQLiteRepository(connID string, cm *databaseConnection.ConnectionManager) (*SQLiteRepository, error) {
	connInfo := databaseConnection.GetConnectionInfoFromDB(connID)
	db, err := cm.GetConnection(connInfo)
	if err != nil {
		return nil, err
	}
	return &SQLiteRepository{db: db, connID: connID, cm: cm}, nil
}

func (r *SQLiteRepository) BuildTree() (*databaseContract.TreeNode, error) {
	root := &databaseContract.TreeNode{
		ID:      r.connID,
		Label:   "SQLite DB",
		Type:    "database",
		Actions: r.GetAvailableActions("database"),
	}

	rows, err := r.db.Query("SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view')")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var name, objType string
		if err := rows.Scan(&name, &objType); err != nil {
			return nil, err
		}
		node := &databaseContract.TreeNode{
			ID:      name,
			Label:   name,
			Type:    objType,
			Actions: r.GetAvailableActions(objType),
		}
		root.Children = append(root.Children, node)
	}
	return root, nil
}

func (r *SQLiteRepository) GetObjectData(nodeID, objType string) (interface{}, error) {
	switch objType {
	case "table":
		rows, err := r.db.Query(fmt.Sprintf("PRAGMA table_info(%s)", nodeID))
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		var columns []databaseContract.ColumnDefinition
		for rows.Next() {
			var cid int
			var name, dataType string
			var notNull, primary int
			var defaultVal sql.NullString
			if err := rows.Scan(&cid, &name, &dataType, &notNull, &defaultVal, &primary); err != nil {
				return nil, err
			}
			columns = append(columns, databaseContract.ColumnDefinition{
				Name:     name,
				DataType: dataType,
				NotNull:  notNull == 1,
				Primary:  primary == 1,
				Default:  defaultVal.String,
			})
		}
		return dto.SQLiteCreateTableParams{Name: nodeID, Columns: columns}, nil
	case "view":
		var query string
		err := r.db.QueryRow(fmt.Sprintf("SELECT sql FROM sqlite_master WHERE type='view' AND name='%s'", nodeID)).Scan(&query)
		if err != nil {
			return nil, err
		}
		return dto.SQLiteCreateObjectParams{Name: nodeID, Type: "view", Query: query, OrReplace: false}, nil
	default:
		return nil, fmt.Errorf("SQLite: unsupported object type: %s", objType)
	}
}

func (r *SQLiteRepository) Create(params interface{}) error {
	switch p := params.(type) {
	case dto.SQLiteCreateTableParams:
		query := fmt.Sprintf("CREATE TABLE %s (", p.Name)
		for i, col := range p.Columns {
			colDef := fmt.Sprintf("%s %s", col.Name, col.DataType)
			if col.NotNull {
				colDef += " NOT NULL"
			}
			if col.Primary {
				colDef += " PRIMARY KEY"
			}
			if col.Default != "" {
				colDef += fmt.Sprintf(" DEFAULT '%s'", col.Default)
			}
			if i < len(p.Columns)-1 {
				colDef += ", "
			}
			query += colDef
		}
		query += ")"
		_, err := r.db.Exec(query)
		return err
	case dto.SQLiteCreateObjectParams:
		switch p.Type {
		case "view":
			query := "CREATE "
			if p.OrReplace {
				query += "OR REPLACE "
			}
			query += fmt.Sprintf("VIEW %s AS %s", p.Name, p.Query)
			_, err := r.db.Exec(query)
			return err
		default:
			return fmt.Errorf("SQLite: unsupported object type: %s", p.Type)
		}
	default:
		return fmt.Errorf("SQLite: invalid params for Create")
	}
}

func (r *SQLiteRepository) Drop(params interface{}) error {
	switch p := params.(type) {
	case dto.DropTableParams:
		query := "DROP TABLE "
		if p.IfExists {
			query += "IF EXISTS "
		}
		query += p.Name
		_, err := r.db.Exec(query)
		return err
	case dto.DropObjectParams:
		if p.Type != "view" {
			return fmt.Errorf("SQLite: only views can be dropped as objects")
		}
		query := "DROP VIEW "
		if p.IfExists {
			query += "IF EXISTS "
		}
		query += p.Name
		_, err := r.db.Exec(query)
		return err
	default:
		return fmt.Errorf("SQLite: invalid params for Drop")
	}
}

func (r *SQLiteRepository) Update(params interface{}) error {
	switch p := params.(type) {
	case dto.SQLiteUpdateTableParams:
		if p.NewName != "" && p.NewName != p.OldName {
			query := fmt.Sprintf("ALTER TABLE %s RENAME TO %s", p.OldName, p.NewName)
			if _, err := r.db.Exec(query); err != nil {
				return err
			}
		}
		if len(p.AddColumns) > 0 {
			for _, col := range p.AddColumns {
				query := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", p.OldName, col.Name, col.DataType)
				if col.NotNull {
					query += " NOT NULL"
				}
				if col.Default != "" {
					query += fmt.Sprintf(" DEFAULT '%s'", col.Default)
				}
				if _, err := r.db.Exec(query); err != nil {
					return err
				}
			}
		}
		return nil
	case dto.SQLiteUpdateObjectParams:
		switch p.Type {
		case "view":
			query := "CREATE "
			if p.OrReplace {
				query += "OR REPLACE "
			}
			query += fmt.Sprintf("VIEW %s AS %s", p.Name, p.Query)
			_, err := r.db.Exec(query)
			return err
		default:
			return fmt.Errorf("SQLite: unsupported object type for update: %s", p.Type)
		}
	default:
		return fmt.Errorf("SQLite: invalid params for Update")
	}
}

func (r *SQLiteRepository) ExecuteQuery(query string, args ...interface{}) (*sql.Rows, error) {
	rows, err := r.db.Query(query, args...)
	if err == nil {
		r.cm.Mutex.Lock()
		if conn, exists := r.cm.Connections[r.connID]; exists {
			conn.LastUsed = time.Now()
		}
		r.cm.Mutex.Unlock()
	}
	return rows, err
}

func (r *SQLiteRepository) Execute(query string, args ...interface{}) (sql.Result, error) {
	result, err := r.db.Exec(query, args...)
	if err == nil {
		r.cm.Mutex.Lock()
		if conn, exists := r.cm.Connections[r.connID]; exists {
			conn.LastUsed = time.Now()
		}
		r.cm.Mutex.Unlock()
	}
	return result, err
}

func (r *SQLiteRepository) GetAvailableActions(nodeType string) []string {
	switch nodeType {
	case "database":
		return []string{"create_table", "create_view"}
	case "table":
		return []string{"edit_table", "drop_table", "copy_name"}
	case "view":
		return []string{"edit_view", "drop_view"}
	default:
		return []string{}
	}
}

func (r *SQLiteRepository) GetFormFields(action string) []databaseContract.FormField {
	switch action {
	case "create_table", "edit_table":
		return []databaseContract.FormField{
			{ID: "name", Label: "Table Name", Type: "text", Required: true},
			{ID: "columns", Label: "Columns", Type: "array", Required: true, Options: []databaseContract.FormFieldOption{
				{Value: "name", Label: "Column Name"},
				{Value: "dataType", Label: "Data Type"},
				{Value: "notNull", Label: "Not Null"},
				{Value: "primary", Label: "Primary Key"},
			}},
		}
	case "create_view", "edit_view":
		return []databaseContract.FormField{
			{ID: "name", Label: "View Name", Type: "text", Required: true},
			{ID: "query", Label: "Query", Type: "textarea", Required: true},
			{ID: "orReplace", Label: "Or Replace", Type: "checkbox"},
		}
	case "drop_table", "drop_view":
		return []databaseContract.FormField{
			{ID: "ifExists", Label: "If Exists", Type: "checkbox"},
		}
	default:
		return []databaseContract.FormField{}
	}
}
