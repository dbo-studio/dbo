package databaseSqlserver

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

type SQLServerRepository struct {
	db     *sql.DB
	connID string
	cm     *databaseConnection.ConnectionManager
}

func NewSQLServerRepository(connID string, cm *databaseConnection.ConnectionManager) (*SQLServerRepository, error) {
	connInfo := databaseConnection.GetConnectionInfoFromDB(connID)
	db, err := cm.GetConnection(connInfo)
	if err != nil {
		return nil, err
	}
	return &SQLServerRepository{db: db, connID: connID, cm: cm}, nil
}

func (r *SQLServerRepository) BuildTree() (*databaseContract.TreeNode, error) {
	root := &databaseContract.TreeNode{
		ID:      "root",
		Label:   "SQL Server",
		Type:    "server",
		Actions: r.GetAvailableActions("root"),
	}

	databases, err := r.db.Query("SELECT name FROM sys.databases")
	if err != nil {
		return nil, err
	}
	defer databases.Close()

	for databases.Next() {
		var dbName string
		if err := databases.Scan(&dbName); err != nil {
			return nil, err
		}
		dbNode := &databaseContract.TreeNode{
			ID:      dbName,
			Label:   dbName,
			Type:    "database",
			Actions: r.GetAvailableActions("database"),
		}

		_, err := r.db.Exec(fmt.Sprintf("USE %s", dbName))
		if err != nil {
			return nil, err
		}

		tables, err := r.db.Query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
		if err != nil {
			return nil, err
		}
		defer tables.Close()

		for tables.Next() {
			var tableName string
			if err := tables.Scan(&tableName); err != nil {
				return nil, err
			}
			tableNode := &databaseContract.TreeNode{
				ID:      fmt.Sprintf("%s.dbo.%s", dbName, tableName),
				Label:   tableName,
				Type:    "table",
				Actions: r.GetAvailableActions("table"),
			}
			dbNode.Children = append(dbNode.Children, tableNode)
		}
		root.Children = append(root.Children, dbNode)
	}
	return root, nil
}

func (r *SQLServerRepository) GetObjectData(nodeID, objType string) (interface{}, error) {
	switch objType {
	case "table":
		rows, err := r.db.Query(fmt.Sprintf("SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '%s'", nodeID))
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		var columns []databaseContract.ColumnDefinition
		for rows.Next() {
			var name, dataType, nullable string
			if err := rows.Scan(&name, &dataType, &nullable); err != nil {
				return nil, err
			}
			columns = append(columns, databaseContract.ColumnDefinition{
				Name:     name,
				DataType: dataType,
				NotNull:  nullable == "NO",
			})
		}
		return dto.SQLServerCreateTableParams{Name: nodeID, Columns: columns}, nil
	case "view":
		var query string
		err := r.db.QueryRow(fmt.Sprintf("SELECT DEFINITION FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_NAME = '%s'", nodeID)).Scan(&query)
		if err != nil {
			return nil, err
		}
		return dto.SQLServerCreateObjectParams{Name: nodeID, Type: "view", Query: query, OrReplace: false}, nil
	default:
		return nil, fmt.Errorf("SQLServer: unsupported object type: %s", objType)
	}
}

func (r *SQLServerRepository) Create(params interface{}) error {
	switch p := params.(type) {
	case dto.SQLServerCreateDatabaseParams:
		query := fmt.Sprintf("CREATE DATABASE %s", p.Name)
		_, err := r.db.Exec(query)
		return err
	case dto.SQLServerCreateTableParams:
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
	case dto.SQLServerCreateObjectParams:
		switch p.Type {
		case "view":
			query := "CREATE "
			if p.OrReplace {
				query = "ALTER "
			}
			query += fmt.Sprintf("VIEW %s AS %s", p.Name, p.Query)
			_, err := r.db.Exec(query)
			return err
		default:
			return fmt.Errorf("SQLServer: unsupported object type: %s", p.Type)
		}
	default:
		return fmt.Errorf("SQLServer: invalid params for Create")
	}
}

func (r *SQLServerRepository) Drop(params interface{}) error {
	switch p := params.(type) {
	case dto.SQLServerDropDatabaseParams:
		query := fmt.Sprintf("DROP DATABASE %s", p.Name)
		_, err := r.db.Exec(query)
		return err
	case dto.DropTableParams:
		query := fmt.Sprintf("DROP TABLE %s", p.Name)
		_, err := r.db.Exec(query)
		return err
	case dto.DropObjectParams:
		query := fmt.Sprintf("DROP %s %s", strings.ToUpper(p.Type), p.Name)
		_, err := r.db.Exec(query)
		return err
	default:
		return fmt.Errorf("SQLServer: invalid params for Drop")
	}
}

func (r *SQLServerRepository) Update(params interface{}) error {
	switch p := params.(type) {
	case dto.SQLServerUpdateTableParams:
		if p.NewName != "" && p.NewName != p.OldName {
			query := fmt.Sprintf("EXEC sp_rename '%s', '%s'", p.OldName, p.NewName)
			if _, err := r.db.Exec(query); err != nil {
				return err
			}
		}
		if len(p.AddColumns) > 0 {
			for _, col := range p.AddColumns {
				query := fmt.Sprintf("ALTER TABLE %s ADD %s %s", p.OldName, col.Name, col.DataType)
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
	case dto.SQLServerUpdateObjectParams:
		switch p.Type {
		case "view":
			query := "CREATE "
			if p.OrReplace {
				query = "ALTER "
			}
			query += fmt.Sprintf("VIEW %s AS %s", p.Name, p.Query)
			_, err := r.db.Exec(query)
			return err
		default:
			return fmt.Errorf("SQLServer: unsupported object type for update: %s", p.Type)
		}
	default:
		return fmt.Errorf("SQLServer: invalid params for Update")
	}
}

func (r *SQLServerRepository) ExecuteQuery(query string, args ...interface{}) (*sql.Rows, error) {
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

func (r *SQLServerRepository) Execute(query string, args ...interface{}) (sql.Result, error) {
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

func (r *SQLServerRepository) GetAvailableActions(nodeType string) []string {
	switch nodeType {
	case "root":
		return []string{"create_database"}
	case "database":
		return []string{"create_table", "create_view", "drop_database"}
	case "table":
		return []string{"edit_table", "drop_table", "copy_name"}
	case "view":
		return []string{"edit_view", "drop_view"}
	default:
		return []string{}
	}
}

func (r *SQLServerRepository) GetFormFields(action string) []databaseContract.FormField {
	switch action {
	case "create_database":
		return []databaseContract.FormField{
			{ID: "name", Label: "Database Name", Type: "text", Required: true},
		}
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
	case "drop_database", "drop_table", "drop_view":
		return []databaseContract.FormField{}
	default:
		return []databaseContract.FormField{}
	}
}
