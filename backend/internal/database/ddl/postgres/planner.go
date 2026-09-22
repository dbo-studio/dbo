package ddlPostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
)

type TableInput struct {
	Schema string
	// NodeTable is the table name resolved from the tree node; used when
	// the general tab payload lacks the old table name (e.g. tables
	// created outside the Object Form).
	NodeTable   string
	Action      contract.TreeNodeActionName
	General     *dto.PostgresTableParams
	Columns     *dto.PostgresTableColumnParams
	Keys        *dto.PostgresTableKeyParams
	ForeignKeys *dto.PostgresTableForeignKeyParams
}

func BuildTablePlan(input TableInput) (ddl.Plan, string, error) {
	switch input.Action {
	case contract.CreateTableAction:
		return buildCreateTablePlan(input)
	case contract.EditTableAction:
		return buildEditTablePlan(input)
	default:
		return nil, "", fmt.Errorf("unsupported table action %q", input.Action)
	}
}

func columnRows(input TableInput) []dto.PostgresTableColumn {
	if input.Columns == nil {
		return nil
	}

	return input.Columns.Columns
}

func keyRows(input TableInput) []dto.PostgresTableKey {
	if input.Keys == nil {
		return nil
	}

	return input.Keys.Columns
}

func foreignKeyRows(input TableInput) []dto.PostgresTableForeignKey {
	if input.ForeignKeys == nil {
		return nil
	}

	return input.ForeignKeys.Columns
}
