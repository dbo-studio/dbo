package databasePostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
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

	queries := append(
		dbQueries,
		schemaQueries...,
	)

	for _, query := range queries {
		if err := r.db.Exec(query).Error; err != nil {
			return err
		}
	}

	return nil

	switch action {
	case contract.CreateTableAction:
		params, err := convertToDTO[dto.PostgresTableParams](params)
		if err != nil {
			return err
		}
		query := fmt.Sprintf("CREATE TABLE %s", params.Name)
		if params.Owner != "" {
			query += fmt.Sprintf(" OWNER %s", params.Owner)
		}
		if params.Tablespace != "" {
			query += fmt.Sprintf(" TABLESPACE %s", params.Tablespace)
		}
		if params.AccessMethod != "" {
			query += fmt.Sprintf(" USING %s", params.AccessMethod)
		}
		if params.Comment != "" {
			query += fmt.Sprintf(" COMMENT '%s'", params.Comment)
		}
		if params.Persistence != "" {
			query += fmt.Sprintf(" WITH %s", params.Persistence)
		}
		if params.PartitionExpression != "" {
			query += fmt.Sprintf(" PARTITION BY %s", params.PartitionExpression)
		}
		if params.PartitionKey != "" {
			query += fmt.Sprintf(" PARTITION BY %s", params.PartitionKey)
		}
		if params.Options != "" {
			query += fmt.Sprintf(" WITH %s", params.Options)
		}
		return r.db.Exec(query).Error

	case contract.EditTableAction:
		params, err := convertToDTO[dto.PostgresTableParams](params)
		if err != nil {
			return err
		}
		query := fmt.Sprintf("ALTER TABLE %s", params.Name)
		if params.Owner != "" {
			query += fmt.Sprintf(" OWNER TO %s", params.Owner)
		}
		if params.Comment != "" {
			query += fmt.Sprintf(" SET COMMENT '%s'", params.Comment)
		}
		if params.Tablespace != "" {
			query += fmt.Sprintf(" SET TABLESPACE %s", params.Tablespace)
		}
		if params.AccessMethod != "" {
			query += fmt.Sprintf(" SET ACCESS METHOD %s", params.AccessMethod)
		}
		if params.Options != "" {
			query += fmt.Sprintf(" SET %s", params.Options)
		}
		if params.PartitionExpression != "" {
			query += fmt.Sprintf(" SET PARTITION BY %s", params.PartitionExpression)
		}
		if params.PartitionKey != "" {
			query += fmt.Sprintf(" SET PARTITION BY %s", params.PartitionKey)
		}
		if params.Persistence != "" {
			query += fmt.Sprintf(" SET PERSISTENCE %s", params.Persistence)
		}
		return r.db.Exec(query).Error

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

	if action == contract.DropDatabaseAction {
		query := fmt.Sprintf("DROP DATABASE %s", node.Database)
		queries = append(queries, query)
	}

	switch tabId {
	case contract.DatabaseTab:
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
		}
	}
	return queries, nil
}

func (r *PostgresRepository) handleSchemaCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	queries := []string{}
	oldFields, err := r.getSchemaInfo(node)
	if err != nil {
		return nil, err
	}

	if action == contract.DropSchemaAction {
		query := fmt.Sprintf("DROP SCHEMA %s", node.Schema)
		queries = append(queries, query)
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
		query := fmt.Sprintf("ALTER SCHEMA %s", *params.Name)
		if params.Owner != nil {
			query += fmt.Sprintf(" OWNER TO %s", *params.Owner)
		}

		queries = append(queries, query)

		if params.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON SCHEMA %s IS %s", findField(oldFields, "Name"), *params.Comment))
		}
	}

	return queries, nil
}

func findField(fields []contract.FormField, field string) string {
	for _, f := range fields {
		if f.Name == field {
			return f.Value.(string)
		}
	}
	return ""
}
