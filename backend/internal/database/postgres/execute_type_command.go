package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *PostgresRepository) handleTypeCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	switch action {
	case contract.DropTypeAction:
		if node.Table == "" {
			return nil, nil
		}

		return []string{"DROP TYPE " + quote.PostgresQualifiedTable(node.Schema, node.Table)}, nil
	case contract.CreateTypeAction, contract.EditTypeAction:
	default:
		return nil, nil
	}

	params, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTypeParams](data)
	if err != nil {
		return nil, err
	}

	typeParams := params[tabID]
	if typeParams == nil || typeParams.New == nil {
		return nil, nil
	}

	if action == contract.CreateTypeAction {
		return createEnumQueries(node.Schema, typeParams.New)
	}

	return editEnumQueries(node, typeParams)
}

func parseEnumLabels(values *string) []string {
	var labels []string

	for _, label := range strings.Split(lo.FromPtr(values), ",") {
		if label = strings.TrimSpace(label); label != "" {
			labels = append(labels, label)
		}
	}

	return labels
}

func createEnumQueries(schema string, enum *dto.PostgresTypeData) ([]string, error) {
	if lo.FromPtr(enum.Name) == "" {
		return nil, fmt.Errorf("missing type name")
	}

	labels := parseEnumLabels(enum.Values)
	if len(labels) == 0 {
		return nil, fmt.Errorf("enum type needs at least one value")
	}

	ref := quote.PostgresQualifiedTable(schema, *enum.Name)
	literals := lo.Map(labels, func(label string, _ int) string { return quote.PostgresLiteral(label) })
	queries := []string{"CREATE TYPE " + ref + " AS ENUM (" + strings.Join(literals, ", ") + ")"}

	if lo.FromPtr(enum.Comment) != "" {
		queries = append(queries, "COMMENT ON TYPE "+ref+" IS "+quote.PostgresLiteral(*enum.Comment))
	}

	return queries, nil
}

// editEnumQueries renames the type and appends new labels. PostgreSQL cannot
// remove or reorder labels, so those edits are rejected rather than ignored.
func editEnumQueries(node contract.DBNode, params *dto.PostgresTypeParams) ([]string, error) {
	oldName := node.Table
	if params.Old != nil && lo.FromPtr(params.Old.Name) != "" {
		oldName = *params.Old.Name
	}

	if oldName == "" {
		return nil, fmt.Errorf("missing type name")
	}

	name := oldName
	ref := quote.PostgresQualifiedTable(node.Schema, name)
	queries := []string{}

	if newName := lo.FromPtr(params.New.Name); newName != "" && newName != oldName {
		queries = append(queries, "ALTER TYPE "+ref+" RENAME TO "+quote.PostgresIdent(newName))
		name = newName
		ref = quote.PostgresQualifiedTable(node.Schema, name)
	}

	if params.New.Values != nil && params.Old != nil {
		oldLabels, newLabels := parseEnumLabels(params.Old.Values), parseEnumLabels(params.New.Values)

		if !isAppendOnly(oldLabels, newLabels) {
			return nil, fmt.Errorf("PostgreSQL enum values can only be appended; removing or reordering is not supported")
		}

		for i := len(oldLabels); i < len(newLabels); i++ {
			queries = append(queries, "ALTER TYPE "+ref+" ADD VALUE "+quote.PostgresLiteral(newLabels[i]))
		}
	}

	if params.New.Comment != nil && (params.Old == nil || lo.FromPtr(params.Old.Comment) != *params.New.Comment) {
		queries = append(queries, "COMMENT ON TYPE "+ref+" IS "+quote.PostgresLiteral(*params.New.Comment))
	}

	return queries, nil
}

func isAppendOnly(oldLabels, newLabels []string) bool {
	if len(newLabels) < len(oldLabels) {
		return false
	}

	for i, label := range oldLabels {
		if newLabels[i] != label {
			return false
		}
	}

	return true
}
