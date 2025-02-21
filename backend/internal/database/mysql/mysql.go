package databaseMysql

import (
	"database/sql"

	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

type MySQLRepository struct {
	db     *sql.DB
	connID string
	cm     *databaseConnection.ConnectionManager
}

func NewMySQLRepository(connID string, cm *databaseConnection.ConnectionManager) (*MySQLRepository, error) {
	connInfo := databaseConnection.GetConnectionInfoFromDB(connID)
	db, err := cm.GetConnection(connInfo)
	if err != nil {
		return nil, err
	}
	return &MySQLRepository{db: db, connID: connID, cm: cm}, nil
}

func (r *MySQLRepository) BuildTree() (*databaseContract.TreeNode, error) {
	root := &databaseContract.TreeNode{
		ID:      "root",
		Label:   "MySQL Server",
		Type:    "server",
		Actions: r.GetAvailableActions("root"),
	}

	databases, err := r.db.Query("SHOW DATABASES")
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

		tables, err := r.db.Query("SHOW TABLES")
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
				ID:      fmt.Sprintf("%s.%s", dbName, tableName),
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

func (r *MySQLRepository) GetObjectData(nodeID, objType string) (interface{}, error) {
	switch objType {
	case "table":
		rows, err := r.db.Query(fmt.Sprintf("SHOW COLUMNS FROM %s", nodeID))
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		var columns []databaseContract.ColumnDefinition
		for rows.Next() {
			var field, colType, null, key, defaultVal, extra string
			if err := rows.Scan(&field, &colType, &null, &key, &defaultVal, &extra); err != nil {
				return nil, err
			}
			columns = append(columns, databaseContract.ColumnDefinition{
				Name:     field,
				DataType: colType,
				NotNull:  null == "NO",
				Primary:  key == "PRI",
				Default:  defaultVal,
			})
		}
		return dto.MySQLCreateTableParams{Name: nodeID, Columns: columns, Engine: "InnoDB"}, nil
	case "view":
		var query string
		err := r.db.QueryRow(fmt.Sprintf("SELECT view_definition FROM information_schema.views WHERE table_name = '%s'", nodeID)).Scan(&query)
		if err != nil {
			return nil, err
		}
		return dto.MySQLCreateObjectParams{Name: nodeID, Type: "view", Query: query, OrReplace: false}, nil
	default:
		return nil, fmt.Errorf("MySQL: unsupported object type: %s", objType)
	}
}

func (r *MySQLRepository) Create(params interface{}) error {
	switch p := params.(type) {
	case dto.MySQLCreateDatabaseParams:
		query := fmt.Sprintf("CREATE DATABASE %s", p.Name)
		if p.Charset != "" {
			query += fmt.Sprintf(" CHARACTER SET %s", p.Charset)
		}
		if p.Collation != "" {
			query += fmt.Sprintf(" COLLATE %s", p.Collation)
		}
		_, err := r.db.Exec(query)
		return err
	case dto.MySQLCreateTableParams:
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
		if p.Engine != "" {
			query += fmt.Sprintf(" ENGINE=%s", p.Engine)
		}
		_, err := r.db.Exec(query)
		return err
	case dto.MySQLCreateObjectParams:
		switch p.Type {
		case "schema":
			return r.Create(dto.MySQLCreateDatabaseParams{
				Name:      p.Name,
				Charset:   p.Charset,
				Collation: p.Collation,
			})
		case "view":
			query := "CREATE "
			if p.OrReplace {
				query += "OR REPLACE "
			}
			query += fmt.Sprintf("VIEW %s AS %s", p.Name, p.Query)
			_, err := r.db.Exec(query)
			return err
		default:
			return fmt.Errorf("MySQL: unsupported object type: %s", p.Type)
		}
	default:
		return fmt.Errorf("MySQL: invalid params for Create")
	}
}

func (r *MySQLRepository) Drop(params interface{}) error {
	switch p := params.(type) {
	case dto.MySQLDropDatabaseParams:
		query := "DROP DATABASE "
		if p.IfExists {
			query += "IF EXISTS "
		}
		query += p.Name
		_, err := r.db.Exec(query)
		return err
	case dto.DropTableParams:
		query := "DROP TABLE "
		if p.IfExists {
			query += "IF EXISTS "
		}
		query += p.Name
		_, err := r.db.Exec(query)
		return err
	case dto.DropObjectParams:
		query := fmt.Sprintf("DROP %s ", strings.ToUpper(p.Type))
		if p.IfExists {
			query += "IF EXISTS "
		}
		query += p.Name
		_, err := r.db.Exec(query)
		return err
	default:
		return fmt.Errorf("MySQL: invalid params for Drop")
	}
}

func (r *MySQLRepository) Update(params interface{}) error {
	switch p := params.(type) {
	case dto.MySQLUpdateTableParams:
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
					query += fmt.Sprintf(" DEFAULT '%s'", col.Default)
				}
				if _, err := r.db.Exec(query); err != nil {
					return err
				}
			}
		}
		if p.Engine != "" {
			query := fmt.Sprintf("ALTER TABLE %s ENGINE = %s", p.OldName, p.Engine)
			if _, err := r.db.Exec(query); err != nil {
				return err
			}
		}
		return nil
	case dto.MySQLUpdateObjectParams:
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
			return fmt.Errorf("MySQL: unsupported object type for update: %s", p.Type)
		}
	default:
		return fmt.Errorf("MySQL: invalid params for Update")
	}
}

func (r *MySQLRepository) ExecuteQuery(query string, args ...interface{}) (*sql.Rows, error) {
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

func (r *MySQLRepository) Execute(query string, args ...interface{}) (sql.Result, error) {
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

func (r *MySQLRepository) GetAvailableActions(nodeType string) []string {
	switch nodeType {
	case "root":
		return []string{"create_database"}
	case "database":
		return []string{"create_table", "create_view", "create_object", "drop_database"}
	case "table":
		return []string{"edit_table", "drop_table", "copy_name"}
	case "view":
		return []string{"edit_view", "drop_view"}
	default:
		return []string{}
	}
}

func (r *MySQLRepository) GetFormFields(action string) []databaseContract.FormField {
	switch action {
	case "create_database":
		charsetOptions := r.getCharsetOptions()
		collationOptions := r.getCollationOptions()
		return []databaseContract.FormField{
			{ID: "name", Label: "Database Name", Type: "text", Required: true},
			{ID: "charset", Label: "Character Set", Type: "select", Options: charsetOptions},
			{ID: "collation", Label: "Collation", Type: "select", Options: collationOptions},
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
			{ID: "engine", Label: "Engine", Type: "select", Options: []databaseContract.FormFieldOption{
				{Value: "InnoDB", Label: "InnoDB"},
				{Value: "MyISAM", Label: "MyISAM"},
			}},
		}
	case "create_view", "edit_view":
		return []databaseContract.FormField{
			{ID: "name", Label: "View Name", Type: "text", Required: true},
			{ID: "query", Label: "Query", Type: "textarea", Required: true},
			{ID: "orReplace", Label: "Or Replace", Type: "checkbox"},
		}
	case "drop_database", "drop_table", "drop_view":
		return []databaseContract.FormField{
			{ID: "ifExists", Label: "If Exists", Type: "checkbox"},
		}
	default:
		return []databaseContract.FormField{}
	}
}

func (r *MySQLRepository) getCharsetOptions() []databaseContract.FormFieldOption {
	rows, err := r.db.Query("SHOW CHARACTER SET")
	if err != nil {
		return []databaseContract.FormFieldOption{}
	}
	defer rows.Close()

	var options []databaseContract.FormFieldOption
	for rows.Next() {
		var charset, description, defaultCollation string
		var maxlen int
		if err := rows.Scan(&charset, &description, &defaultCollation, &maxlen); err != nil {
			continue
		}
		options = append(options, databaseContract.FormFieldOption{Value: charset, Label: fmt.Sprintf("%s (%s)", charset, description)})
	}
	return options
}

func (r *MySQLRepository) getCollationOptions() []databaseContract.FormFieldOption {
	rows, err := r.db.Query("SHOW COLLATION")
	if err != nil {
		return []databaseContract.FormFieldOption{}
	}
	defer rows.Close()

	var options []databaseContract.FormFieldOption
	for rows.Next() {
		var collation, charset string
		var id int
		var defaultVal, compiled string
		var sortlen int
		if err := rows.Scan(&collation, &charset, &id, &defaultVal, &compiled, &sortlen); err != nil {
			continue
		}
		options = append(options, databaseContract.FormFieldOption{Value: collation, Label: fmt.Sprintf("%s (%s)", collation, charset)})
	}
	return options
}
