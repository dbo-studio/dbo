package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *PostgresRepository) handleTableKeyCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	node = resolveCreateTableNode(node, action, data)

	if tabID != contract.TableKeysTab || node.Table == "" || (action != contract.CreateTableAction && action != contract.EditTableAction) {
		return queries, nil
	}

	paramsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableKeyParams](data)
	if err != nil {
		return nil, err
	}

	params := paramsDto[tabID]
	if params == nil {
		return queries, nil
	}

	tableRef := qualifiedTableName(node.Schema, node.Table)
	alter := fmt.Sprintf("ALTER TABLE %s", tableRef)

	for _, key := range params.Columns {
		if key.New == nil {
			continue
		}

		if action == contract.CreateTableAction || lo.FromPtr(key.Added) {
			query := buildPostgresAddKeyQuery(alter, key.New)
			if query != "" {
				queries = append(queries, query)
			}

			if key.New.Comment != nil && *key.New.Comment != "" && key.New.Name != nil {
				queries = append(queries, fmt.Sprintf("COMMENT ON CONSTRAINT %s ON %s IS '%s'",
					*key.New.Name, tableRef, *key.New.Comment))
			}

			continue
		}

		if lo.FromPtr(key.Deleted) {
			constraintName := constraintNameFromKey(key)
			if constraintName != "" {
				queries = append(queries, fmt.Sprintf("%s DROP CONSTRAINT %s", alter, constraintName))
			}

			continue
		}

		if key.New.Comment != nil && *key.New.Comment != "" {
			constraintName := constraintNameFromKey(key)
			if constraintName != "" {
				queries = append(queries, fmt.Sprintf("COMMENT ON CONSTRAINT %s ON %s IS '%s'",
					constraintName, tableRef, *key.New.Comment))
			}
		}
	}

	return queries, nil
}

func constraintNameFromKey(key dto.PostgresTableKey) string {
	if key.Old != nil && key.Old.Name != nil {
		return *key.Old.Name
	}

	if key.New != nil && key.New.Name != nil {
		return *key.New.Name
	}

	return ""
}

func buildPostgresAddKeyQuery(alter string, key *dto.PostgresTableKeyData) string {
	if key == nil || len(key.Columns) == 0 || key.Name == nil || *key.Name == "" {
		return ""
	}

	cols := strings.Join(lo.Map(key.Columns, func(col string, _ int) string {
		return fmt.Sprintf(`"%s"`, col)
	}), ", ")

	if lo.FromPtr(key.Primary) {
		return appendKeyDeferrableClauses(
			fmt.Sprintf("%s ADD CONSTRAINT %s PRIMARY KEY (%s)", alter, *key.Name, cols),
			key,
		)
	}

	if key.ExcludeOperator != nil && *key.ExcludeOperator != "" {
		return appendKeyDeferrableClauses(
			fmt.Sprintf("%s ADD CONSTRAINT %s EXCLUDE USING %s (%s)", alter, *key.Name, *key.ExcludeOperator, cols),
			key,
		)
	}

	return appendKeyDeferrableClauses(
		fmt.Sprintf("%s ADD CONSTRAINT %s UNIQUE (%s)", alter, *key.Name, cols),
		key,
	)
}

func appendKeyDeferrableClauses(query string, key *dto.PostgresTableKeyData) string {
	if lo.FromPtr(key.Deferrable) {
		query += " DEFERRABLE"
	}

	if lo.FromPtr(key.InitiallyDeferred) {
		query += " INITIALLY DEFERRED"
	}

	return query
}
