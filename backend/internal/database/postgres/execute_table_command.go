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

	if action == contract.CreateTableAction {
		dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresTableParams](params)
		if err != nil {
			return nil, tableName, err
		}

		params := dto[tabId]

		tableName = *params.New.Name
		query := fmt.Sprintf("CREATE TABLE %s (", *params.New.Name)
		if params.New.Tablespace != nil {
			query += fmt.Sprintf(") TABLESPACE %s", *params.New.Tablespace)
		} else {
			query += ")"
		}

		queries = append(queries, query)

		if params.New.Persistence != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s SET %s", *params.New.Name, *params.New.Persistence))
		}

		if params.New.Owner != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s OWNER TO \"%s\"", *params.New.Name, *params.New.Owner))
		}

		if params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON TABLE %s IS '%s'", *params.New.Name, *params.New.Comment))
		}
	}

	if action == contract.EditTableAction {
		dtoParams, err := convertToDTO[map[contract.TreeTab]*dto.PostgresTableParams](params)
		if err != nil {
			return nil, tableName, err
		}

		params := dtoParams[tabId]
		tableName = *params.New.Name

		if params.New.Name != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s RENAME TO %s", *params.Old.Name, *params.New.Name))
		}
		if params.New.Tablespace != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s SET TABLESPACE %s", *params.Old.Tablespace, *params.New.Tablespace))
		}

		if params.New.Persistence != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s SET %s", *params.Old.Persistence, *params.New.Persistence))
		}

		if params.New.Owner != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE %s OWNER TO \"%s\"", *params.Old.Owner, *params.New.Owner))
		}

		if params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON TABLE %s IS '%s'", *params.Old.Comment, *params.New.Comment))
		}
	}

	if action == contract.DropTableAction {
		query := fmt.Sprintf("DROP TABLE %s", node.Table)
		queries = append(queries, query)
	}

	return queries, tableName, nil
}
