package databasePostgres

import (
	"fmt"
	"net/url"
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

func (r *PostgresRepository) Execute(nodeID string, action contract.TreeNodeActionName, params []byte) error {
	node := extractNode(nodeID)
	type ExecuteParams map[contract.TreeTab]any
	executeParams, err := convertToDTO[ExecuteParams](params)
	if err != nil {
		return err
	}

	queries := []string{}

	tableName := ""
	for tabId := range executeParams {
		dbQueries, err := r.handleDatabaseCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		schemaQueries, err := r.handleSchemaCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		tableQueries, t, err := r.handleTableCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		if tableName == "" {
			tableName = t
		}

		tableColumnQueries, err := r.handleTableColumnCommands(node, tableName, tabId, action, params)
		if err != nil {
			return err
		}

		tableForeignKeyQueries, err := r.handleForeignKeyCommands(node, tableName, tabId, action, params)
		if err != nil {
			return err
		}

		queries = append(queries, dbQueries...)
		queries = append(queries, schemaQueries...)
		queries = append(queries, tableQueries...)
		queries = append(queries, tableColumnQueries...)
		queries = append(queries, tableForeignKeyQueries...)
	}

	for _, query := range queries {
		if query == "" {
			continue
		}

		query, err = url.PathUnescape(query)
		if err != nil {
			return err
		}

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
		dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresDatabaseParams](params)
		if err != nil {
			return nil, err
		}

		params := dto[tabId]

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
		dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresSchemaParams](params)
		if err != nil {
			return nil, err
		}
		params := dto[tabId]

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

func (r *PostgresRepository) handleTableCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, string, error) {
	queries := []string{}
	var tableName string

	if tabId != contract.TableTab && action != contract.DropTableAction {
		return queries, tableName, nil
	}

	oldFields, err := r.getTableInfo(node, action)
	if err != nil {
		return queries, tableName, err
	}

	switch action {
	case contract.CreateTableAction:
		dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresTableParams](params)
		if err != nil {
			return nil, tableName, err
		}

		params := dto[tabId]

		tableName = *params.Name
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
		dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresTableParams](params)
		if err != nil {
			return nil, tableName, err
		}

		params := dto[tabId]
		tableName = *params.Name

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

	return queries, tableName, nil
}

func (r *PostgresRepository) handleTableColumnCommands(node PGNode, tableName string, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	queries := []string{}

	if tabId != contract.TableColumnsTab || node.Table == "" {
		return queries, nil
	}

	oldFields, err := r.getTableColumns(node)
	if err != nil {
		return queries, err
	}

	switch action {
	case contract.CreateTableAction:
		dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresTableColumnParams](params)
		if err != nil {
			return nil, err
		}

		params := dto[tabId]
		for _, column := range params.Columns {
			columnDef := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", tableName, *column.Name, *column.DataType)

			if column.MaxLength != nil {
				columnDef = fmt.Sprintf("%s(%s)", columnDef, *column.MaxLength)
			}

			if column.NumericScale != nil {
				columnDef = fmt.Sprintf("%s(%s,%s)", columnDef, *column.MaxLength, *column.NumericScale)
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

			queries = append(queries, columnDef)

			if column.Comment != nil {
				queries = append(queries, fmt.Sprintf("COMMENT ON COLUMN %s.%s IS '%s'",
					tableName, *column.Name, *column.Comment))
			}
		}

	case contract.EditTableAction:
		dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresTableColumnParams](params)
		if err != nil {
			return nil, err
		}

		params := dto[tabId]

		for _, column := range params.Columns {
			alter := fmt.Sprintf(`ALTER TABLE "%s"."%s" `, node.Schema, node.Table)

			if lo.FromPtr(column.Deleted) {
				queries = append(queries, fmt.Sprintf("%s DROP COLUMN %s", alter, *column.Name))
				continue
			}

			if column.Name != nil {
				queries = append(queries, fmt.Sprintf(`%s RENAME COLUMN "%s" TO "%s"`, alter, findField(oldFields, "Name"), *column.Name))
			}

			if column.DataType != nil {
				dataTypeQuery := fmt.Sprintf(`%s ALTER COLUMN "%s" TYPE %s USING "%s"::%s`,
					alter, *column.Name, *column.DataType, *column.Name, *column.DataType)

				if column.MaxLength != nil && *column.MaxLength != "" {
					if isCharacterType(*column.DataType) {
						dataTypeQuery = fmt.Sprintf("%s(%s)", dataTypeQuery, *column.MaxLength)
					} else if isNumericType(*column.DataType) && column.NumericScale != nil {
						dataTypeQuery = fmt.Sprintf("%s(%s,%s)", dataTypeQuery, *column.MaxLength, *column.NumericScale)
					}
				}

				queries = append(queries, dataTypeQuery)
			}

			if column.NotNull != nil {
				if *column.NotNull {
					queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" SET NOT NULL`,
						alter, *column.Name))
				} else {
					queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" DROP NOT NULL`,
						alter, *column.Name))
				}
			}

			if column.Default != nil {
				if *column.Default != "" {
					queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" SET DEFAULT %s`,
						alter, *column.Name, *column.Default))
				} else {
					queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" DROP DEFAULT`,
						alter, *column.Name))
				}
			}

			if column.Comment != nil {
				commentQuery := fmt.Sprintf("COMMENT ON COLUMN %s.%s IS '%s'",
					node.Table, *column.Name, *column.Comment)
				queries = append(queries, commentQuery)
			}
		}
	}
	return queries, nil
}

func (r *PostgresRepository) handleForeignKeyCommands(node PGNode, tableName string, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	queries := []string{}

	if tabId != contract.TableForeignKeysTab || node.Table == "" {
		return queries, nil
	}

	oldFields, err := r.getTableForeignKeys(node)
	if err != nil {
		return nil, err
	}

	switch action {
	case contract.CreateTableAction:
		dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresTableForeignKeyParams](params)
		if err != nil {
			return nil, err
		}

		params := dto[tabId]
		for _, column := range params.Columns {
			columnDef := fmt.Sprintf("ALTER TABLE %s ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s(%s)",
				tableName,
				*column.ConstraintName,
				strings.Join(column.SourceColumns, ","),
				*column.TargetTable,
				strings.Join(column.TargetColumns, ","),
			)

			if column.OnUpdate != nil {
				columnDef += fmt.Sprintf(" ON UPDATE %s", *column.OnUpdate)
			}

			if column.OnDelete != nil {
				columnDef += fmt.Sprintf(" ON DELETE %s", *column.OnDelete)
			}

			if lo.FromPtr(column.IsDeferrable) {
				columnDef += " DEFERRABLE"
			}

			if lo.FromPtr(column.InitiallyDeferred) {
				columnDef += " INITIALLY DEFERRED"
			}

			queries = append(queries, columnDef)

			if column.Comment != nil {
				queries = append(queries, fmt.Sprintf("COMMENT ON CONSTRAINT %s ON %s IS '%s'",
					*column.ConstraintName, tableName, *column.Comment))
			}
		}

	case contract.EditTableAction:
		dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresTableForeignKeyParams](params)
		if err != nil {
			return nil, err
		}

		params := dto[tabId]

		for _, column := range params.Columns {
			if lo.FromPtr(column.Deleted) {
				queries = append(queries, fmt.Sprintf("ALTER TABLE %s DROP CONSTRAINT %s", node.Table, *column.ConstraintName))
				continue
			}

			if column.ConstraintName != nil {
				queries = append(queries, fmt.Sprintf("ALTER TABLE %s RENAME CONSTRAINT %s TO %s", node.Table, findField(oldFields, "Constraint Name"), *column.ConstraintName))
			}

			if column.SourceColumns != nil || column.TargetTable != nil || column.TargetColumns != nil {
				queries = append(queries, fmt.Sprintf("ALTER TABLE %s DROP CONSTRAINT %s, ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s(%s)",
					node.Table,
					*column.ConstraintName,
					*column.ConstraintName,
					strings.Join(column.SourceColumns, ","),
					*column.TargetTable,
					strings.Join(column.TargetColumns, ",")))
			}

			if column.IsDeferrable != nil {
				if *column.IsDeferrable {
					queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER CONSTRAINT %s DEFERRABLE", node.Table, *column.ConstraintName))
				} else {
					queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER CONSTRAINT %s NOT DEFERRABLE", node.Table, *column.ConstraintName))
				}
			}

			if column.InitiallyDeferred != nil {
				if *column.InitiallyDeferred {
					queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER CONSTRAINT %s INITIALLY DEFERRED", node.Table, *column.ConstraintName))
				} else {
					queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER CONSTRAINT %s INITIALLY IMMEDIATE", node.Table, *column.ConstraintName))
				}
			}

			if column.OnUpdate != nil {
				queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER CONSTRAINT %s ON UPDATE %s", node.Table, *column.ConstraintName, *column.OnUpdate))
			}

			if column.OnDelete != nil {
				queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER CONSTRAINT %s ON DELETE %s", node.Table, *column.ConstraintName, *column.OnDelete))
			}

			if column.Comment != nil && *column.Comment != "" {
				commentQuery := fmt.Sprintf("COMMENT ON CONSTRAINT %s ON %s IS '%s'",
					*column.ConstraintName, node.Table, *column.Comment)
				queries = append(queries, commentQuery)
			}
		}
	}
	return queries, nil
}

func isCharacterType(dataType string) bool {
	characterTypes := []string{"char", "character", "varchar", "character varying", "text"}
	for _, t := range characterTypes {
		if dataType == t {
			return true
		}
	}
	return false
}

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
		if f.Type == "array" {
			for _, object := range f.Fields {
				for _, item := range object.Fields {
					if item.Name == field {
						return item.Value.(string)
					}
				}
			}
		}

		if f.Name == field {
			return f.Value.(string)
		}
	}
	return ""
}
