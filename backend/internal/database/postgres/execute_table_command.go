package databasePostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

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

	if action == contract.CreateTableAction {
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
	}

	if action == contract.EditTableAction {
		dtoParams, err := convertToDTO[map[contract.TreeTab]*dto.PostgresTableParams](params)
		if err != nil {
			return nil, tableName, err
		}

		params := dtoParams[tabId]
		tableName = *params.Name
		params = compareAndSetNil(params, oldFields)

		if params.Name != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s RENAME TO %s", findField(oldFields, "relname"), *params.Name))
		}
		if params.Tablespace != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s SET TABLESPACE %s", findField(oldFields, "relname"), *params.Tablespace))
		}

		if params.Persistence != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s SET %s", findField(oldFields, "relname"), *params.Persistence))
		}

		if params.Owner != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s OWNER TO \"%s\"", findField(oldFields, "relname"), *params.Owner))
		}

		if params.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON TABLE %s IS '%s'", findField(oldFields, "relname"), *params.Comment))
		}
	}

	if action == contract.DropTableAction {
		query := fmt.Sprintf("DROP TABLE %s", node.Table)
		queries = append(queries, query)
	}

	return queries, tableName, nil
}
