package databasePostgres

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

type PostgresRepository struct {
	db     *sql.DB
	connID string
	cm     *databaseConnection.ConnectionManager
}

func NewPostgresRepository(connID string, cm *databaseConnection.ConnectionManager) (*PostgresRepository, error) {
	connInfo := databaseConnection.GetConnectionInfoFromDB(connID)
	db, err := cm.GetConnection(connInfo)
	if err != nil {
		return nil, err
	}
	return &PostgresRepository{db: db, connID: connID, cm: cm}, nil
}

func (r *PostgresRepository) BuildTree() (*databaseContract.TreeNode, error) {
	root := &databaseContract.TreeNode{
		ID:      "root",
		Label:   "PostgreSQL Server",
		Type:    "server",
		Actions: r.GetAvailableActions("root"),
	}

	schemaRows, err := r.db.Query("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema')")
	if err != nil {
		return nil, err
	}
	defer schemaRows.Close()

	for schemaRows.Next() {
		var schemaName string
		if err := schemaRows.Scan(&schemaName); err != nil {
			return nil, err
		}
		schemaNode := &databaseContract.TreeNode{
			ID:      schemaName,
			Label:   schemaName,
			Type:    "schema",
			Actions: r.GetAvailableActions("schema"),
		}

		tableRows, err := r.db.Query("SELECT table_name FROM information_schema.tables WHERE table_schema = $1", schemaName)
		if err != nil {
			return nil, err
		}
		defer tableRows.Close()
		for tableRows.Next() {
			var tableName string
			if err := tableRows.Scan(&tableName); err != nil {
				return nil, err
			}
			tableNode := &databaseContract.TreeNode{
				ID:      fmt.Sprintf("%s.%s", schemaName, tableName),
				Label:   tableName,
				Type:    "table",
				Actions: r.GetAvailableActions("table"),
			}
			schemaNode.Children = append(schemaNode.Children, tableNode)
		}

		viewRows, err := r.db.Query("SELECT table_name FROM information_schema.views WHERE table_schema = $1", schemaName)
		if err != nil {
			return nil, err
		}
		defer viewRows.Close()
		for viewRows.Next() {
			var viewName string
			if err := viewRows.Scan(&viewName); err != nil {
				return nil, err
			}
			viewNode := &databaseContract.TreeNode{
				ID:      fmt.Sprintf("%s.%s", schemaName, viewName),
				Label:   viewName,
				Type:    "view",
				Actions: r.GetAvailableActions("view"),
			}
			schemaNode.Children = append(schemaNode.Children, viewNode)
		}

		root.Children = append(root.Children, schemaNode)
	}
	return root, nil
}

func (r *PostgresRepository) GetObjectData(nodeID, objType string) (interface{}, error) {
	switch objType {
	case "table":
		rows, err := r.db.Query(fmt.Sprintf("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '%s'", nodeID))
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		var columns []databaseContract.ColumnDefinition
		for rows.Next() {
			var name, dataType, nullable string
			var defaultVal sql.NullString
			if err := rows.Scan(&name, &dataType, &nullable, &defaultVal); err != nil {
				return nil, err
			}
			columns = append(columns, databaseContract.ColumnDefinition{
				Name:     name,
				DataType: dataType,
				NotNull:  nullable == "NO",
				Default:  defaultVal.String,
			})
		}
		return dto.PostgresCreateTableParams{Name: nodeID, Columns: columns}, nil
	case "view", "materialized_view":
		var query string
		err := r.db.QueryRow(fmt.Sprintf("SELECT definition FROM pg_views WHERE viewname = '%s'", nodeID)).Scan(&query)
		if err != nil {
			return nil, err
		}
		return dto.PostgresCreateObjectParams{Name: nodeID, Type: objType, Query: query, OrReplace: false, WithData: objType == "materialized_view"}, nil
	default:
		return nil, fmt.Errorf("PostgreSQL: unsupported object type: %s", objType)
	}
}

func (r *PostgresRepository) Create(params interface{}) error {
	switch p := params.(type) {
	case dto.PostgresCreateDatabaseParams:
		query := fmt.Sprintf("CREATE DATABASE %s", p.Name)
		if p.Owner != "" {
			query += fmt.Sprintf(" OWNER %s", p.Owner)
		}
		if p.Encoding != "" {
			query += fmt.Sprintf(" ENCODING '%s'", p.Encoding)
		}
		if p.Template != "" {
			query += fmt.Sprintf(" TEMPLATE %s", p.Template)
		}
		_, err := r.db.Exec(query)
		return err
	case dto.PostgresCreateTableParams:
		query := "CREATE "
		if p.Temp {
			query += "TEMPORARY "
		}
		query += fmt.Sprintf("TABLE %s (", p.Name)
		for i, col := range p.Columns {
			colDef := fmt.Sprintf("%s %s", col.Name, col.DataType)
			if col.NotNull {
				colDef += " NOT NULL"
			}
			if col.Primary {
				colDef += " PRIMARY KEY"
			}
			if col.Default != "" {
				colDef += fmt.Sprintf(" DEFAULT %s", col.Default)
			}
			if i < len(p.Columns)-1 {
				colDef += ", "
			}
			query += colDef
		}
		query += ")"
		_, err := r.db.Exec(query)
		return err
	case dto.PostgresCreateObjectParams:
		switch p.Type {
		case "schema":
			query := fmt.Sprintf("CREATE SCHEMA %s", p.Name)
			if p.Owner != "" {
				query += fmt.Sprintf(" AUTHORIZATION %s", p.Owner)
			}
			_, err := r.db.Exec(query)
			return err
		case "view":
			query := "CREATE "
			if p.OrReplace {
				query += "OR REPLACE "
			}
			query += fmt.Sprintf("VIEW %s AS %s", p.Name, p.Query)
			_, err := r.db.Exec(query)
			return err
		case "materialized_view":
			query := fmt.Sprintf("CREATE MATERIALIZED VIEW %s AS %s", p.Name, p.Query)
			if !p.WithData {
				query += " WITH NO DATA"
			}
			_, err := r.db.Exec(query)
			return err
		default:
			return fmt.Errorf("PostgreSQL: unsupported object type: %s", p.Type)
		}
	default:
		return fmt.Errorf("PostgreSQL: invalid params for Create")
	}
}

func (r *PostgresRepository) Drop(params interface{}) error {
	switch p := params.(type) {
	case dto.PostgresDropDatabaseParams:
		query := "DROP DATABASE "
		if p.IfExists {
			query += "IF EXISTS "
		}
		query += p.Name
		if p.Cascade {
			query += " CASCADE"
		}
		_, err := r.db.Exec(query)
		return err
	case dto.DropTableParams:
		query := "DROP TABLE "
		if p.IfExists {
			query += "IF EXISTS "
		}
		query += p.Name
		if p.Cascade {
			query += " CASCADE"
		}
		_, err := r.db.Exec(query)
		return err
	case dto.DropObjectParams:
		query := fmt.Sprintf("DROP %s ", strings.ToUpper(p.Type))
		if p.IfExists {
			query += "IF EXISTS "
		}
		query += p.Name
		if p.Cascade {
			query += " CASCADE"
		}
		_, err := r.db.Exec(query)
		return err
	default:
		return fmt.Errorf("PostgreSQL: invalid params for Drop")
	}
}

func (r *PostgresRepository) Update(params interface{}) error {
	switch p := params.(type) {
	case dto.PostgresUpdateTableParams:
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
				if col.Primary {
					query += " PRIMARY KEY"
				}
				if col.Default != "" {
					query += fmt.Sprintf(" DEFAULT %s", col.Default)
				}
				if _, err := r.db.Exec(query); err != nil {
					return err
				}
			}
		}
		return nil
	case dto.PostgresUpdateObjectParams:
		switch p.Type {
		case "view":
			query := "CREATE "
			if p.OrReplace {
				query += "OR REPLACE "
			}
			query += fmt.Sprintf("VIEW %s AS %s", p.Name, p.Query)
			_, err := r.db.Exec(query)
			return err
		case "materialized_view":
			query := fmt.Sprintf("CREATE MATERIALIZED VIEW %s AS %s", p.Name, p.Query)
			if p.OrReplace {
				query = "DROP MATERIALIZED VIEW IF EXISTS " + p.Name + "; " + query
			}
			if !p.WithData {
				query += " WITH NO DATA"
			}
			_, err := r.db.Exec(query)
			return err
		default:
			return fmt.Errorf("PostgreSQL: unsupported object type for update: %s", p.Type)
		}
	default:
		return fmt.Errorf("PostgreSQL: invalid params for Update")
	}
}

func (r *PostgresRepository) ExecuteQuery(query string, args ...interface{}) (*sql.Rows, error) {
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

func (r *PostgresRepository) Execute(query string, args ...interface{}) (sql.Result, error) {
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

func (r *PostgresRepository) GetAvailableActions(nodeType string) []string {
	switch nodeType {
	case "root":
		return []string{"create_database"}
	case "database":
		return []string{"create_schema", "create_table", "create_view", "drop_database"}
	case "schema":
		return []string{"create_table", "create_view", "create_materialized_view", "drop_schema"}
	case "table":
		return []string{"edit_table", "drop_table", "copy_name"}
	case "view":
		return []string{"edit_view", "drop_view"}
	case "materialized_view":
		return []string{"edit_materialized_view", "drop_materialized_view"}
	default:
		return []string{}
	}
}

func (r *PostgresRepository) GetFormFields(action string) []databaseContract.FormField {
	switch action {
	case "create_database":
		templateOptions := r.getTemplateOptions()
		encodingOptions := []databaseContract.FormFieldOption{
			{Value: "UTF8", Label: "UTF-8"},
			{Value: "SQL_ASCII", Label: "SQL ASCII"},
			{Value: "LATIN1", Label: "Latin-1"},
		}
		return []databaseContract.FormField{
			{ID: "name", Label: "Database Name", Type: "text", Required: true},
			{ID: "owner", Label: "Owner", Type: "text"},
			{ID: "encoding", Label: "Encoding", Type: "select", Options: encodingOptions},
			{ID: "template", Label: "Template", Type: "select", Options: templateOptions},
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
			{ID: "temp", Label: "Temporary", Type: "checkbox"},
		}
	case "create_view", "edit_view", "create_materialized_view", "edit_materialized_view":
		fields := []databaseContract.FormField{
			{ID: "name", Label: "View Name", Type: "text", Required: true},
			{ID: "query", Label: "Query", Type: "textarea", Required: true},
			{ID: "orReplace", Label: "Or Replace", Type: "checkbox"},
		}
		if action == "create_materialized_view" || action == "edit_materialized_view" {
			fields = append(fields, databaseContract.FormField{ID: "withData", Label: "With Data", Type: "checkbox"})
		}
		return fields
	case "drop_database", "drop_schema", "drop_table", "drop_view", "drop_materialized_view":
		return []databaseContract.FormField{
			{ID: "ifExists", Label: "If Exists", Type: "checkbox"},
			{ID: "cascade", Label: "Cascade", Type: "checkbox"},
		}
	default:
		return []databaseContract.FormField{}
	}
}

func (r *PostgresRepository) getTemplateOptions() []databaseContract.FormFieldOption {
	rows, err := r.db.Query("SELECT datname FROM pg_database WHERE datistemplate")
	if err != nil {
		return []databaseContract.FormFieldOption{{Value: "template0", Label: "template0"}, {Value: "template1", Label: "template1"}}
	}
	defer rows.Close()

	var options []databaseContract.FormFieldOption
	for rows.Next() {
		var template string
		if err := rows.Scan(&template); err != nil {
			continue
		}
		options = append(options, databaseContract.FormFieldOption{Value: template, Label: template})
	}
	return options
}
