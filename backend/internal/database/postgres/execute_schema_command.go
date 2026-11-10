package databasePostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *PostgresRepository) handleSchemaCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if action != contract.CreateSchemaAction && action != contract.EditSchemaAction && action != contract.DropSchemaAction {
		return queries, nil
	}

	if action == contract.DropSchemaAction {
		if node.Schema == "" {
			return queries, nil
		}

		queries = append(queries, fmt.Sprintf("DROP SCHEMA %s CASCADE", quote.PostgresIdent(node.Schema)))

		return queries, nil
	}

	dto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresSchemaParams](data)
	if err != nil {
		return nil, err
	}

	params := dto[tabID]
	if params == nil {
		return queries, nil
	}

	if action == contract.CreateSchemaAction {
		if params.New == nil || params.New.Name == nil {
			return queries, nil
		}

		schemaName := quote.PostgresIdent(*params.New.Name)

		queries = append(queries, fmt.Sprintf("CREATE SCHEMA %s", schemaName))

		if params.New.Owner != nil {
			queries = append(queries, fmt.Sprintf("ALTER SCHEMA %s OWNER TO %s", schemaName, quote.PostgresIdent(*params.New.Owner)))
		}

		if params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON SCHEMA %s IS %s", schemaName, quote.PostgresLiteral(*params.New.Comment)))
		}
	}

	if action == contract.EditSchemaAction {
		if params.Old == nil || params.New == nil || params.Old.Name == nil {
			return queries, nil
		}

		schemaName := quote.PostgresIdent(*params.Old.Name)

		if params.New.Name != nil && *params.Old.Name != *params.New.Name {
			queries = append(queries, fmt.Sprintf("ALTER SCHEMA %s RENAME TO %s", schemaName, quote.PostgresIdent(*params.New.Name)))
			schemaName = quote.PostgresIdent(*params.New.Name)
		}

		if params.New.Owner != nil && (params.Old.Owner == nil || *params.Old.Owner != *params.New.Owner) {
			queries = append(queries, fmt.Sprintf("ALTER SCHEMA %s OWNER TO %s", schemaName, quote.PostgresIdent(*params.New.Owner)))
		}

		if params.New.Comment != nil && (params.Old.Comment == nil || *params.Old.Comment != *params.New.Comment) {
			queries = append(queries, fmt.Sprintf("COMMENT ON SCHEMA %s IS %s", schemaName, quote.PostgresLiteral(*params.New.Comment)))
		}
	}

	return queries, nil
}
