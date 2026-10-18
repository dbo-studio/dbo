package databasePostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *PostgresRepository) handleMaterializedViewCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	switch action {
	case contract.RefreshMaterializedViewAction, contract.RefreshMaterializedViewNoDataAction:
		if tabID != contract.GeneralTab || node.Table == "" {
			return queries, nil
		}

		query := "REFRESH MATERIALIZED VIEW " + quote.PostgresQualifiedTable(node.Schema, node.Table)
		if action == contract.RefreshMaterializedViewNoDataAction {
			query += " WITH NO DATA"
		}

		return []string{query}, nil
	case contract.CreateMaterializedViewAction, contract.EditMaterializedViewAction, contract.DropMaterializedViewAction:
	default:
		return queries, nil
	}

	dto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresMaterializedViewParams](data)
	if err != nil {
		return nil, err
	}

	params := dto[tabID]
	if params == nil {
		return queries, nil
	}

	if params.New != nil && params.New.Query != nil {
		params.New.Query = formatQuery(params.New.Query)
	}

	if params.Old != nil && params.Old.Query != nil {
		params.Old.Query = formatQuery(params.Old.Query)
	}

	if action == contract.CreateMaterializedViewAction {
		if params.New == nil || params.New.Name == nil {
			return queries, nil
		}

		viewRef := quote.PostgresQualifiedTable(node.Schema, *params.New.Name)
		query := fmt.Sprintf("CREATE MATERIALIZED VIEW %s", viewRef)

		if params.New.Tablespace != nil {
			query += fmt.Sprintf(" TABLESPACE %s", *params.New.Tablespace)
		}

		if params.New.Query != nil {
			query += fmt.Sprintf(` AS %s`, *params.New.Query)
		}

		queries = append(queries, query)

		if params.New.Owner != nil {
			queries = append(queries, fmt.Sprintf(`ALTER MATERIALIZED VIEW %s OWNER TO %s`, viewRef, *params.New.Owner))
		}

		if params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON MATERIALIZED VIEW %s IS '%s'", viewRef, *params.New.Comment))
		}
	}

	if action == contract.EditMaterializedViewAction {
		queries = append(queries, editMaterializedViewQueries(node, params)...)
	}

	if action == contract.DropMaterializedViewAction {
		query := fmt.Sprintf(`DROP MATERIALIZED VIEW "%s"."%s"`, node.Schema, node.Table)
		queries = append(queries, query)
	}

	return queries, nil
}

// editMaterializedViewQueries applies in-place changes (rename, owner,
// tablespace, comment). A changed definition cannot be altered, so the view
// is dropped and recreated, which also drops its data until it is refreshed.
func editMaterializedViewQueries(node contract.DBNode, params *dto.PostgresMaterializedViewParams) []string {
	if params.Old == nil || params.New == nil || lo.FromPtr(params.Old.Name) == "" {
		return nil
	}

	oldData, newData := params.Old, params.New
	name := *oldData.Name
	ref := quote.PostgresQualifiedTable(node.Schema, name)
	queries := []string{}

	if ddl.PtrStringChanged(oldData.Query, newData.Query) {
		queries = append(queries, "DROP MATERIALIZED VIEW "+ref)

		newName := lo.FromPtr(newData.Name)
		if newName == "" {
			newName = name
		}

		ref = quote.PostgresQualifiedTable(node.Schema, newName)
		create := "CREATE MATERIALIZED VIEW " + ref
		if tablespace := lo.FromPtr(newData.Tablespace); tablespace != "" {
			create += " TABLESPACE " + quote.PostgresIdent(tablespace)
		}

		queries = append(queries, create+" AS "+*newData.Query)

		if owner := lo.FromPtr(newData.Owner); owner != "" {
			queries = append(queries, "ALTER MATERIALIZED VIEW "+ref+" OWNER TO "+quote.PostgresIdent(owner))
		}

		if comment := lo.FromPtr(newData.Comment); comment != "" {
			queries = append(queries, "COMMENT ON MATERIALIZED VIEW "+ref+" IS "+quote.PostgresLiteral(comment))
		}

		return queries
	}

	if ddl.PtrStringChanged(oldData.Tablespace, newData.Tablespace) && *newData.Tablespace != "" {
		queries = append(queries, "ALTER MATERIALIZED VIEW "+ref+" SET TABLESPACE "+quote.PostgresIdent(*newData.Tablespace))
	}

	if ddl.PtrStringChanged(oldData.Owner, newData.Owner) && *newData.Owner != "" {
		queries = append(queries, "ALTER MATERIALIZED VIEW "+ref+" OWNER TO "+quote.PostgresIdent(*newData.Owner))
	}

	if ddl.PtrStringChanged(oldData.Comment, newData.Comment) {
		queries = append(queries, "COMMENT ON MATERIALIZED VIEW "+ref+" IS "+quote.PostgresLiteral(*newData.Comment))
	}

	if ddl.PtrStringChanged(oldData.Name, newData.Name) && *newData.Name != "" {
		queries = append(queries, "ALTER MATERIALIZED VIEW "+ref+" RENAME TO "+quote.PostgresIdent(*newData.Name))
	}

	return queries
}
