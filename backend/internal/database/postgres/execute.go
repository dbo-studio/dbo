package databasePostgres

import (
	"fmt"
	"net/url"

	contract "github.com/dbo-studio/dbo/internal/database/contract"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

func (r *PostgresRepository) Execute(nodeID string, action contract.TreeNodeActionName, params []byte) error {
	node := extractNode(nodeID)
	type ExecuteParams map[contract.TreeTab]any
	executeParams, err := convertToDTO[ExecuteParams](params)
	if err != nil {
		return err
	}

	queries := []string{}

	for tabId := range executeParams {
		dbQueries, err := r.handleDatabaseCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		viewQueries, err := r.handleViewCommands(node, tabId, action, params)
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

		if node.Table == "" {
			node.Table = t
		}

		tableColumnQueries, err := r.handleTableColumnCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		tableForeignKeyQueries, err := r.handleForeignKeyCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		queries = append(queries, dbQueries...)
		queries = append(queries, viewQueries...)
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
	case contract.CreateMaterializedViewAction:
		params, err := convertToDTO[dto.PostgresMaterializedViewParams](params)
		if err != nil {
			return err
		}
		query := fmt.Sprintf("CREATE MATERIALIZED VIEW %s AS %s", params.Name, params.Query)
		if params.CheckOption != nil {
			query += fmt.Sprintf(" WITH %s CHECK OPTION", *params.CheckOption)
		}
		if params.Comment != nil {
			query += fmt.Sprintf(" WITH COMMENT = '%s'", *params.Comment)
		}
		return r.db.Exec(query).Error

	case contract.EditMaterializedViewAction:
		params, err := convertToDTO[dto.PostgresMaterializedViewParams](params)
		if err != nil {
			return err
		}
		query := fmt.Sprintf("CREATE OR REPLACE MATERIALIZED VIEW %s AS %s", params.Name, params.Query)
		if params.CheckOption != nil {
			query += fmt.Sprintf(" WITH %s CHECK OPTION", *params.CheckOption)
		}
		if params.Comment != nil {
			query += fmt.Sprintf(" WITH COMMENT = '%s'", *params.Comment)
		}
		return r.db.Exec(query).Error

	case contract.CreateIndexAction:
		params, err := convertToDTO[dto.PostgresIndexParams](params)
		if err != nil {
			return err
		}
		query := "CREATE"
		if params.Unique != nil && *params.Unique {
			query += " UNIQUE"
		}
		query += fmt.Sprintf(" INDEX %s", params.Name)
		if params.AccessMethod != nil {
			query += fmt.Sprintf(" USING %s", *params.AccessMethod)
		}
		query += fmt.Sprintf(" ON %s (%s)", params.Name, params.Columns)
		if params.Condition != nil {
			query += fmt.Sprintf(" WHERE %s", *params.Condition)
		}
		if params.IncludeColumns != nil {
			query += fmt.Sprintf(" INCLUDE (%s)", *params.IncludeColumns)
		}
		if params.Tablespace != nil {
			query += fmt.Sprintf(" TABLESPACE %s", *params.Tablespace)
		}
		if params.Comment != nil {
			query += fmt.Sprintf(" WITH COMMENT = '%s'", *params.Comment)
		}
		return r.db.Exec(query).Error

	case contract.EditIndexAction:
		params, err := convertToDTO[dto.PostgresIndexParams](params)
		if err != nil {
			return err
		}
		query := fmt.Sprintf("ALTER INDEX %s", params.Name)
		if params.Comment != nil {
			query += fmt.Sprintf(" SET COMMENT '%s'", *params.Comment)
		}
		if params.AccessMethod != nil {
			query += fmt.Sprintf(" SET ACCESS METHOD %s", *params.AccessMethod)
		}
		if params.Tablespace != nil {
			query += fmt.Sprintf(" SET TABLESPACE %s", *params.Tablespace)
		}
		if params.Unique != nil && *params.Unique {
			query += " UNIQUE"
		}
		if params.Columns != nil {
			query += fmt.Sprintf(" ON %s (%s)", params.Name, *params.Columns)
		}
		if params.Condition != nil {
			query += fmt.Sprintf(" WHERE %s", *params.Condition)
		}
		if params.IncludeColumns != nil {
			query += fmt.Sprintf(" INCLUDE (%s)", *params.IncludeColumns)
		}
		return r.db.Exec(query).Error

	case contract.CreateSequenceAction:
		params, err := convertToDTO[dto.PostgresSequenceParams](params)
		if err != nil {
			return err
		}
		query := fmt.Sprintf("CREATE SEQUENCE %s", params.Name)
		if params.Increment != nil {
			query += fmt.Sprintf(" INCREMENT BY %d", *params.Increment)
		}
		if params.MinValue != nil {
			query += fmt.Sprintf(" MINVALUE %d", *params.MinValue)
		}
		if params.MaxValue != nil {
			query += fmt.Sprintf(" MAXVALUE %d", *params.MaxValue)
		}
		if params.StartValue != nil {
			query += fmt.Sprintf(" START WITH %d", *params.StartValue)
		}
		if params.Cache != nil {
			query += fmt.Sprintf(" CACHE %d", *params.Cache)
		}
		if params.Cycle != nil && *params.Cycle {
			query += " CYCLE"
		}
		if params.OwnedBy != nil {
			query += fmt.Sprintf(" OWNED BY %s", *params.OwnedBy)
		}
		if params.Comment != nil {
			query += fmt.Sprintf(" WITH COMMENT = '%s'", *params.Comment)
		}
		return r.db.Exec(query).Error

	case contract.EditSequenceAction:
		params, err := convertToDTO[dto.PostgresSequenceParams](params)
		if err != nil {
			return err
		}
		query := fmt.Sprintf("ALTER SEQUENCE %s", params.Name)
		if params.Increment != nil {
			query += fmt.Sprintf(" INCREMENT BY %d", *params.Increment)
		}
		if params.MinValue != nil {
			query += fmt.Sprintf(" MINVALUE %d", *params.MinValue)
		}
		if params.MaxValue != nil {
			query += fmt.Sprintf(" MAXVALUE %d", *params.MaxValue)
		}
		if params.StartValue != nil {
			query += fmt.Sprintf(" RESTART WITH %d", *params.StartValue)
		}
		if params.Cache != nil {
			query += fmt.Sprintf(" CACHE %d", *params.Cache)
		}
		if params.Cycle != nil && *params.Cycle {
			query += " CYCLE"
		} else {
			query += " NO CYCLE"
		}
		if params.Comment != nil {
			query += fmt.Sprintf(" WITH COMMENT = '%s'", *params.Comment)
		}
		return r.db.Exec(query).Error

	default:
		return fmt.Errorf("unknown action: %s", action)
	}
}
