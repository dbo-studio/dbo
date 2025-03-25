package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type PostgresRepository struct {
	db         *gorm.DB
	connection *model.Connection
}

func NewPostgresRepository(connection *model.Connection, cm *databaseConnection.ConnectionManager) (contract.DatabaseRepository, error) {
	db, err := cm.GetConnection(connection)
	if err != nil {
		return nil, err
	}
	return &PostgresRepository{
		db:         db,
		connection: connection,
	}, nil
}

func (r *PostgresRepository) Execute(nodeID string, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) error {
	node := extractNode(nodeID)
	dbQueries, err := r.handleDatabaseCommands(node, tabId, action, params)
	if err != nil {
		return err
	}

	schemaQueries, err := r.handleSchemaCommands(node, tabId, action, params)
	if err != nil {
		return err
	}

	tableQueries, err := r.handleTableCommands(node, tabId, action, params)
	if err != nil {
		return err
	}

	tableColumnQueries, err := r.handleTableColumnCommands(node, tabId, action, params)
	if err != nil {
		return err
	}

	queries := append(dbQueries, schemaQueries...)
	queries = append(queries, tableQueries...)
	queries = append(queries, tableColumnQueries...)

	for _, query := range queries {
		if err := r.db.Exec(query).Error; err != nil {
			return err
		}
	}

	return nil

	switch action {
	case contract.CreateViewAction:
		params, err := convertToDTO[dto.PostgresViewParams](params)
		if err != nil {
			return err
		}
		query := fmt.Sprintf("CREATE VIEW %s AS %s", params.Name, params.Query)
		if params.CheckOption != "" {
			query += fmt.Sprintf(" WITH %s CHECK OPTION", params.CheckOption)
		}
		if params.Comment != "" {
			query += fmt.Sprintf(" WITH COMMENT = '%s'", params.Comment)
		}
		return r.db.Exec(query).Error

	case contract.EditViewAction:
		params, err := convertToDTO[dto.PostgresViewParams](params)
		if err != nil {
			return err
		}
		query := fmt.Sprintf("CREATE OR REPLACE VIEW %s AS %s", params.Name, params.Query)
		if params.CheckOption != "" {
			query += fmt.Sprintf(" WITH %s CHECK OPTION", params.CheckOption)
		}
		if params.Comment != "" {
			query += fmt.Sprintf(" WITH COMMENT = '%s'", params.Comment)
		}
		return r.db.Exec(query).Error

	case contract.CreateMaterializedViewAction:
		params, err := convertToDTO[dto.PostgresMaterializedViewParams](params)
		if err != nil {
			return err
		}
		query := fmt.Sprintf("CREATE MATERIALIZED VIEW %s AS %s", params.Name, params.Query)
		if params.CheckOption != "" {
			query += fmt.Sprintf(" WITH %s CHECK OPTION", params.CheckOption)
		}
		if params.Comment != "" {
			query += fmt.Sprintf(" WITH COMMENT = '%s'", params.Comment)
		}
		return r.db.Exec(query).Error

	case contract.EditMaterializedViewAction:
		params, err := convertToDTO[dto.PostgresMaterializedViewParams](params)
		if err != nil {
			return err
		}
		query := fmt.Sprintf("CREATE OR REPLACE MATERIALIZED VIEW %s AS %s", params.Name, params.Query)
		if params.CheckOption != "" {
			query += fmt.Sprintf(" WITH %s CHECK OPTION", params.CheckOption)
		}
		if params.Comment != "" {
			query += fmt.Sprintf(" WITH COMMENT = '%s'", params.Comment)
		}
		return r.db.Exec(query).Error

	case contract.CreateIndexAction:
		params, err := convertToDTO[dto.PostgresIndexParams](params)
		if err != nil {
			return err
		}
		query := "CREATE"
		if params.Unique {
			query += " UNIQUE"
		}
		query += fmt.Sprintf(" INDEX %s", params.Name)
		if params.AccessMethod != "" {
			query += fmt.Sprintf(" USING %s", params.AccessMethod)
		}
		query += fmt.Sprintf(" ON %s (%s)", params.Name, params.Columns)
		if params.Condition != "" {
			query += fmt.Sprintf(" WHERE %s", params.Condition)
		}
		if params.IncludeColumns != "" {
			query += fmt.Sprintf(" INCLUDE (%s)", params.IncludeColumns)
		}
		if params.Tablespace != "" {
			query += fmt.Sprintf(" TABLESPACE %s", params.Tablespace)
		}
		if params.Comment != "" {
			query += fmt.Sprintf(" WITH COMMENT = '%s'", params.Comment)
		}
		return r.db.Exec(query).Error

	case contract.EditIndexAction:
		params, err := convertToDTO[dto.PostgresIndexParams](params)
		if err != nil {
			return err
		}
		query := fmt.Sprintf("ALTER INDEX %s", params.Name)
		if params.Comment != "" {
			query += fmt.Sprintf(" SET COMMENT '%s'", params.Comment)
		}
		if params.AccessMethod != "" {
			query += fmt.Sprintf(" SET ACCESS METHOD %s", params.AccessMethod)
		}
		if params.Tablespace != "" {
			query += fmt.Sprintf(" SET TABLESPACE %s", params.Tablespace)
		}
		if params.Unique {
			query += " UNIQUE"
		}
		if params.Columns != "" {
			query += fmt.Sprintf(" ON %s (%s)", params.Name, params.Columns)
		}
		if params.Condition != "" {
			query += fmt.Sprintf(" WHERE %s", params.Condition)
		}
		if params.IncludeColumns != "" {
			query += fmt.Sprintf(" INCLUDE (%s)", params.IncludeColumns)
		}
		return r.db.Exec(query).Error

	case contract.CreateSequenceAction:
		params, err := convertToDTO[dto.PostgresSequenceParams](params)
		if err != nil {
			return err
		}
		query := fmt.Sprintf("CREATE SEQUENCE %s", params.Name)
		if params.Increment != 0 {
			query += fmt.Sprintf(" INCREMENT BY %d", params.Increment)
		}
		if params.MinValue != 0 {
			query += fmt.Sprintf(" MINVALUE %d", params.MinValue)
		}
		if params.MaxValue != 0 {
			query += fmt.Sprintf(" MAXVALUE %d", params.MaxValue)
		}
		if params.StartValue != 0 {
			query += fmt.Sprintf(" START WITH %d", params.StartValue)
		}
		if params.Cache != 0 {
			query += fmt.Sprintf(" CACHE %d", params.Cache)
		}
		if params.Cycle {
			query += " CYCLE"
		}
		if params.OwnedBy != "" {
			query += fmt.Sprintf(" OWNED BY %s", params.OwnedBy)
		}
		if params.Comment != "" {
			query += fmt.Sprintf(" WITH COMMENT = '%s'", params.Comment)
		}
		return r.db.Exec(query).Error

	case contract.EditSequenceAction:
		params, err := convertToDTO[dto.PostgresSequenceParams](params)
		if err != nil {
			return err
		}
		query := fmt.Sprintf("ALTER SEQUENCE %s", params.Name)
		if params.Increment != 0 {
			query += fmt.Sprintf(" INCREMENT BY %d", params.Increment)
		}
		if params.MinValue != 0 {
			query += fmt.Sprintf(" MINVALUE %d", params.MinValue)
		}
		if params.MaxValue != 0 {
			query += fmt.Sprintf(" MAXVALUE %d", params.MaxValue)
		}
		if params.StartValue != 0 {
			query += fmt.Sprintf(" RESTART WITH %d", params.StartValue)
		}
		if params.Cache != 0 {
			query += fmt.Sprintf(" CACHE %d", params.Cache)
		}
		if params.Cycle {
			query += " CYCLE"
		} else {
			query += " NO CYCLE"
		}
		if params.Comment != "" {
			query += fmt.Sprintf(" WITH COMMENT = '%s'", params.Comment)
		}
		return r.db.Exec(query).Error

	default:
		return fmt.Errorf("unknown action: %s", action)
	}
}

func (r *PostgresRepository) handleDatabaseCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	queries := []string{}

	oldFields, err := r.getDatabaseInfo(node)
	if err != nil {
		return nil, err
	}

	switch action {
	case contract.CreateDatabaseAction:
		params, err := convertToDTO[dto.PostgresDatabaseParams](params)
		if err != nil {
			return nil, err
		}
		query := fmt.Sprintf("CREATE DATABASE %s", *params.Name)
		if params.Owner != nil {
			query += fmt.Sprintf(" OWNER %s", *params.Owner)
		}
		if params.Template != nil {
			query += fmt.Sprintf(" TEMPLATE %s", *params.Template)
		}
		if params.Tablespace != nil {
			query += fmt.Sprintf(" TABLESPACE %s", *params.Tablespace)
		}

		queries = append(queries, query)

		if params.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON DATABASE %s IS '%s'", *params.Name, *params.Comment))
		}

	case contract.EditDatabaseAction:
		params, err := convertToDTO[dto.PostgresDatabaseParams](params)
		if err != nil {
			return nil, err
		}

		if params.Name != nil {
			query := fmt.Sprintf("ALTER DATABASE %s RENAME TO %s", findField(oldFields, "Name"), *params.Name)
			queries = append(queries, query)
		}

		if params.Owner != nil {
			query := fmt.Sprintf("ALTER DATABASE %s OWNER TO %s", findField(oldFields, "Name"), *params.Owner)
			queries = append(queries, query)
		}

		if params.Tablespace != nil {
			query := fmt.Sprintf("ALTER DATABASE %s SET tablespace = %s", findField(oldFields, "Name"), *params.Tablespace)
			queries = append(queries, query)
		}

		if params.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON DATABASE %s IS %s", findField(oldFields, "Name"), *params.Comment))
		}

	case contract.DropDatabaseAction:
		query := fmt.Sprintf("DROP DATABASE %s", node.Database)
		queries = append(queries, query)
	}

	return queries, nil
}

func (r *PostgresRepository) handleSchemaCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	queries := []string{}

	oldFields, err := r.getSchemaInfo(node)
	if err != nil {
		return nil, err
	}

	switch action {
	case contract.CreateSchemaAction:
		params, err := convertToDTO[dto.PostgresSchemaParams](params)
		if err != nil {
			return nil, err
		}
		query := fmt.Sprintf("CREATE SCHEMA %s", *params.Name)

		if params.Owner != nil {
			query += fmt.Sprintf(" AUTHORIZATION %s", *params.Owner)
		}

		queries = append(queries, query)

		if params.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON SCHEMA %s IS '%s'", *params.Name, *params.Comment))
		}

	case contract.EditSchemaAction:
		params, err := convertToDTO[dto.PostgresSchemaParams](params)
		if err != nil {
			return nil, err
		}

		if params.Name != nil {
			queries = append(queries, fmt.Sprintf("ALTER SCHEMA %s RENAME TO %s", findField(oldFields, "Name"), *params.Name))
		}

		if params.Owner != nil {
			queries = append(queries, fmt.Sprintf("ALTER SCHEMA %s OWNER TO %s", findField(oldFields, "Name"), *params.Owner))
		}

		if params.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON SCHEMA %s IS %s", findField(oldFields, "Name"), *params.Comment))
		}

	case contract.DropSchemaAction:
		query := fmt.Sprintf("DROP SCHEMA %s", node.Schema)
		queries = append(queries, query)
	}

	return queries, nil
}

func (r *PostgresRepository) handleTableCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	queries := []string{}

	oldFields, err := r.getTableInfo(node, action)
	if err != nil {
		return nil, err
	}

	if tabId != contract.TableTab {
		return queries, nil
	}

	switch action {
	case contract.CreateTableAction:
		params, err := convertToDTO[dto.PostgresTableParams](params)
		if err != nil {
			return nil, err
		}

		query := fmt.Sprintf("CREATE TABLE %s (", *params.Name)
		if params.Tablespace != nil {
			query += fmt.Sprintf(") TABLESPACE %s", *params.Tablespace)
		} else {
			query += ")"
		}

		queries = append(queries, query)

		if params.Persistence != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s SET %s", *params.Name, *params.Persistence))
		}

		if params.Owner != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s OWNER TO \"%s\"", *params.Name, *params.Owner))
		}

		if params.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON TABLE %s IS '%s'", *params.Name, *params.Comment))
		}

	case contract.EditTableAction:
		params, err := convertToDTO[dto.PostgresTableParams](params)
		if err != nil {
			return nil, err
		}
		if params.Name != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s RENAME TO %s", findField(oldFields, "Name"), *params.Name))
		}
		if params.Tablespace != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s SET TABLESPACE %s", findField(oldFields, "Name"), *params.Tablespace))
		}

		if params.Persistence != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s SET %s", findField(oldFields, "Name"), *params.Persistence))
		}

		if params.Owner != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s OWNER TO \"%s\"", findField(oldFields, "Name"), *params.Owner))
		}

		if params.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON TABLE %s IS '%s'", findField(oldFields, "Name"), *params.Comment))
		}

	case contract.DropTableAction:
		query := fmt.Sprintf("DROP TABLE %s", node.Table)
		queries = append(queries, query)
	}

	return queries, nil
}

func (r *PostgresRepository) handleTableColumnCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	queries := []string{}

	if tabId != contract.TableColumnsTab {
		return queries, nil
	}

	switch action {
	case contract.CreateTableAction:
		params, err := convertToDTO[dto.PostgresTableColumnParams](params)
		if err != nil {
			return nil, err
		}

		for _, column := range params.Columns {
			columnDef := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", node.Table, *column.Name, *column.DataType)

			if column.MaxLength != nil {
				columnDef = fmt.Sprintf("%s(%d)", columnDef, *column.MaxLength)
			}

			if column.NumericScale != nil {
				columnDef = fmt.Sprintf("%s(%d,%d)", columnDef, *column.MaxLength, *column.NumericScale)
			}

			if lo.FromPtr(column.NotNull) {
				columnDef += " NOT NULL"
			}

			if lo.FromPtr(column.Primary) {
				columnDef += " PRIMARY KEY"
			}

			if column.Default != nil {
				columnDef += fmt.Sprintf(" DEFAULT %s", *column.Default)
			}

			if lo.FromPtr(column.IsIdentity) {
				columnDef += " GENERATED ALWAYS AS IDENTITY"
			}

			if lo.FromPtr(column.IsGenerated) {
				if column.Default != nil {
					columnDef += fmt.Sprintf(" GENERATED ALWAYS AS (%s) STORED", *column.Default)
				}
			}

			alterQuery := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s", node.Table, columnDef)

			queries = append(queries, alterQuery)

			if column.Comment != nil {
				queries = append(queries, fmt.Sprintf("COMMENT ON COLUMN %s.%s IS '%s'",
					node.Table, *column.Name, *column.Comment))
			}
		}

	case contract.EditTableAction:
		params, err := convertToDTO[dto.PostgresTableColumnParams](params)
		if err != nil {
			return nil, err
		}

		for _, column := range params.Columns {
			// Handle column rename if needed
			// We'd need additional info to know the old name

			// Handle data type change
			if column.DataType != nil && *column.DataType != "" {
				dataTypeQuery := fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s TYPE %s",
					node.Table, *column.Name, *column.DataType)

				// Handle length/precision for the type
				if column.MaxLength != nil && *column.MaxLength > 0 {
					if isCharacterType(*column.DataType) {
						dataTypeQuery = fmt.Sprintf("%s(%d)", dataTypeQuery, *column.MaxLength)
					} else if isNumericType(*column.DataType) && column.NumericScale != nil {
						dataTypeQuery = fmt.Sprintf("%s(%d,%d)", dataTypeQuery, *column.MaxLength, *column.NumericScale)
					}
				}

				queries = append(queries, dataTypeQuery)
			}

			// Handle NOT NULL constraint
			if column.NotNull != nil {
				if *column.NotNull {
					queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s SET NOT NULL",
						node.Table, *column.Name))
				} else {
					queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s DROP NOT NULL",
						node.Table, *column.Name))
				}
			}

			// Handle DEFAULT value
			if column.Default != nil {
				if *column.Default != "" {
					queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s SET DEFAULT %s",
						node.Table, *column.Name, *column.Default))
				} else {
					queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s DROP DEFAULT",
						node.Table, *column.Name))
				}
			}

			// Handle comment
			if column.Comment != nil && *column.Comment != "" {
				commentQuery := fmt.Sprintf("COMMENT ON COLUMN %s.%s IS '%s'",
					node.Table, *column.Name, *column.Comment)
				queries = append(queries, commentQuery)
			}
		}

	case contract.DropTableAction:
		// No additional column-specific actions needed for dropping the entire table
	}

	return queries, nil
}

// Helper function to check if a data type is a character type
func isCharacterType(dataType string) bool {
	characterTypes := []string{"char", "character", "varchar", "character varying", "text"}
	for _, t := range characterTypes {
		if dataType == t {
			return true
		}
	}
	return false
}

// Helper function to check if a data type is a numeric type that needs precision/scale
func isNumericType(dataType string) bool {
	numericTypes := []string{"numeric", "decimal"}
	for _, t := range numericTypes {
		if dataType == t {
			return true
		}
	}
	return false
}

func findField(fields []contract.FormField, field string) string {
	for _, f := range fields {
		if f.Name == field {
			return f.Value.(string)
		}
	}
	return ""
}

// Helper function to build a CREATE TABLE query with columns
func buildCreateTableQuery(tableName string, columns []struct {
	Name         *string `json:"column_name"`
	DataType     *string `json:"data_type,omitempty"`
	NotNull      *bool   `json:"not_null,omitempty"`
	Primary      *bool   `json:"primary,omitempty"`
	Default      *string `json:"column_default,omitempty"`
	Comment      *string `json:"comment,omitempty"`
	MaxLength    *int64  `json:"character_maximum_length,omitempty"`
	NumericScale *int64  `json:"numeric_scale,omitempty"`
	IsIdentity   *bool   `json:"is_identity,omitempty"`
	IsGenerated  *bool   `json:"is_generated,omitempty"`
}) string {
	// Start with the basic CREATE TABLE statement
	query := fmt.Sprintf("CREATE TABLE %s (", tableName)

	// If there are no columns provided, add a default ID column
	if len(columns) == 0 {
		query += "id SERIAL PRIMARY KEY"
	} else {
		columnDefs := make([]string, 0, len(columns))

		for _, col := range columns {
			// Start with column name and data type
			colDef := fmt.Sprintf("%s %s", *col.Name, *col.DataType)

			// Handle character/numeric type length specifications
			if col.MaxLength != nil && *col.MaxLength > 0 {
				// For character types
				if isCharacterType(*col.DataType) {
					colDef = fmt.Sprintf("%s(%d)", colDef, *col.MaxLength)
				} else if isNumericType(*col.DataType) && col.NumericScale != nil {
					colDef = fmt.Sprintf("%s(%d,%d)", colDef, *col.MaxLength, *col.NumericScale)
				}
			}

			// Add NOT NULL constraint if specified
			if col.NotNull != nil && *col.NotNull {
				colDef += " NOT NULL"
			}

			// Add PRIMARY KEY constraint if specified
			if col.Primary != nil && *col.Primary {
				colDef += " PRIMARY KEY"
			}

			// Add DEFAULT value if specified
			if col.Default != nil && *col.Default != "" {
				colDef += fmt.Sprintf(" DEFAULT %s", *col.Default)
			}

			// Handle identity column if specified
			if col.IsIdentity != nil && *col.IsIdentity {
				colDef += " GENERATED ALWAYS AS IDENTITY"
			}

			// Handle generated column if specified
			if col.IsGenerated != nil && *col.IsGenerated {
				// For generated columns, the default value should be an expression
				if col.Default != nil && *col.Default != "" {
					colDef += fmt.Sprintf(" GENERATED ALWAYS AS (%s) STORED", *col.Default)
				}
			}

			columnDefs = append(columnDefs, colDef)
		}

		query += strings.Join(columnDefs, ", ")
	}

	// Close the parenthesis
	query += ")"

	return query
}
