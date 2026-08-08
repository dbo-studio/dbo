package databasePostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *PostgresRepository) handleTableCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, string, error) {
	queries := []string{}

	var tableName string

	if tabID != contract.GeneralTab && action != contract.DropTableAction {
		return queries, "", nil
	}

	if action == contract.CreateTableAction {
		dto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableParams](params)
		if err != nil {
			return nil, tableName, err
		}

		params := dto[tabID]

		tableName = *params.New.Name
		tableRef := qualifiedTableName(node.Schema, tableName)

		query := fmt.Sprintf("CREATE TABLE %s (", tableRef)
		if params.New.Tablespace != nil {
			query += fmt.Sprintf(") TABLESPACE %s", *params.New.Tablespace)
		} else {
			query += ")"
		}

		queries = append(queries, query)

		if params.New.Persistence != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s SET %s", tableRef, *params.New.Persistence))
		}

		if params.New.Owner != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s OWNER TO \"%s\"", tableRef, *params.New.Owner))
		}

		if params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON TABLE %s IS '%s'", tableRef, *params.New.Comment))
		}
	}

	if action == contract.EditTableAction {
		dtoParams, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableParams](params)
		if err != nil {
			return nil, tableName, err
		}

		params := dtoParams[tabID]
		if params == nil || params.Old == nil || params.Old.Name == nil {
			return queries, tableName, nil
		}

		tableName = *params.Old.Name
		tableRef := qualifiedTableName(node.Schema, tableName)

		if params.New != nil && params.New.Name != nil && *params.Old.Name != *params.New.Name {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s RENAME TO %s", tableRef, *params.New.Name))
			tableName = *params.New.Name
			tableRef = qualifiedTableName(node.Schema, tableName)
		}

		if params.New != nil && params.New.Tablespace != nil &&
			(params.Old.Tablespace == nil || *params.Old.Tablespace != *params.New.Tablespace) {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s SET TABLESPACE %s", tableRef, *params.New.Tablespace))
		}

		if params.New != nil && params.New.Persistence != nil &&
			(params.Old.Persistence == nil || *params.Old.Persistence != *params.New.Persistence) {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s SET %s", tableRef, *params.New.Persistence))
		}

		if params.New != nil && params.New.Owner != nil &&
			(params.Old.Owner == nil || *params.Old.Owner != *params.New.Owner) {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s OWNER TO \"%s\"", tableRef, *params.New.Owner))
		}

		if params.New != nil && params.New.Comment != nil &&
			(params.Old.Comment == nil || *params.Old.Comment != *params.New.Comment) {
			queries = append(queries, fmt.Sprintf("COMMENT ON TABLE %s IS '%s'", tableRef, *params.New.Comment))
		}
	}

	if action == contract.DropTableAction {
		query := fmt.Sprintf("DROP TABLE %s", qualifiedTableName(node.Schema, node.Table))
		queries = append(queries, query)
	}

	return queries, tableName, nil
}
