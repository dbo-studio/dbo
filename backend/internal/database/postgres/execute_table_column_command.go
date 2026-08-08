package databasePostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *PostgresRepository) handleTableColumnCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	node = resolveCreateTableNode(node, action, data)

	if tabID != contract.TableColumnsTab || node.Table == "" || (action != contract.CreateTableAction && action != contract.EditTableAction) {
		return queries, nil
	}

	paramsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableColumnParams](data)
	if err != nil {
		return nil, err
	}

	params := paramsDto[tabID]

	if action == contract.CreateTableAction {
		for _, column := range params.Columns {
			queries = append(queries, r.handleCreateColumn(node, column)...)
		}
	}

	if action == contract.EditTableAction {
		for _, column := range params.Columns {
			if column.New == nil {
				continue
			}

			if lo.FromPtr(column.Added) {
				queries = append(queries, r.handleCreateColumn(node, column)...)
			} else {
				queries = append(queries, r.handleEditColumn(node, column)...)
			}
		}
	}

	return queries, nil
}

func (r *PostgresRepository) handleCreateColumn(node contract.DBNode, column dto.PostgresTableColumn) []string {
	queries := []string{}

	tableRef := qualifiedTableName(node.Schema, node.Table)
	columnDef := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", tableRef, *column.New.Name, *column.New.DataType)

	if column.New.MaxLength != nil {
		columnDef = fmt.Sprintf("%s(%d)", columnDef, *column.New.MaxLength)
	}

	if column.New.NumericScale != nil {
		columnDef = fmt.Sprintf("%s(%d,%d)", columnDef, *column.New.MaxLength, *column.New.NumericScale)
	}

	if lo.FromPtr(column.New.NotNull) {
		columnDef += " NOT NULL"
	}

	if lo.FromPtr(column.New.Primary) {
		columnDef += " PRIMARY KEY"
	}

	if column.New.Default != nil {
		columnDef += fmt.Sprintf(" DEFAULT %s", *column.New.Default)
	}

	if lo.FromPtr(column.New.IsIdentity) {
		columnDef += " GENERATED ALWAYS AS IDENTITY"
	}

	if lo.FromPtr(column.New.IsGenerated) {
		if column.New.Default != nil {
			columnDef += fmt.Sprintf(" GENERATED ALWAYS AS (%s) STORED", *column.New.Default)
		}
	}

	queries = append(queries, columnDef)

	if column.New.Comment != nil {
		queries = append(queries, fmt.Sprintf("COMMENT ON COLUMN %s.%s IS '%s'",
			tableRef, *column.New.Name, *column.New.Comment))
	}

	return queries
}

func (r *PostgresRepository) handleEditColumn(node contract.DBNode, column dto.PostgresTableColumn) []string {
	queries := []string{}

	alter := fmt.Sprintf(`ALTER TABLE "%s"."%s" `, node.Schema, node.Table)

	if lo.FromPtr(column.Deleted) {
		queries = append(queries, fmt.Sprintf("%s DROP COLUMN %s", alter, *column.New.Name))
		return queries
	}

	if column.Old.Name != nil && column.New.Name != nil && *column.Old.Name != *column.New.Name {
		queries = append(queries, fmt.Sprintf(`%s RENAME COLUMN "%s" TO "%s"`, alter, *column.Old.Name, *column.New.Name))
		column.Old.Name = column.New.Name
	}

	if column.Old.Name == nil && column.New.Name != nil {
		column.Old.Name = column.New.Name
	}

	if column.Old.DataType != nil && column.New.DataType != nil && *column.Old.DataType != *column.New.DataType {
		dataTypeQuery := fmt.Sprintf(`%s ALTER COLUMN "%s" TYPE %s USING "%s"::%s`,
			alter, *column.Old.Name, *column.New.DataType, *column.Old.Name, *column.New.DataType)

		if column.New.MaxLength != nil {
			if r.base.IsCharacterType(*column.New.DataType) {
				dataTypeQuery = fmt.Sprintf("%s(%d)", dataTypeQuery, *column.New.MaxLength)
			} else if r.base.IsNumericType(*column.New.DataType) && column.New.NumericScale != nil {
				dataTypeQuery = fmt.Sprintf("%s(%d,%d)", dataTypeQuery, *column.New.MaxLength, *column.New.NumericScale)
			}
		}

		queries = append(queries, dataTypeQuery)
	}

	oldNotNull := lo.FromPtr(column.Old.NotNull)
	if column.New.NotNull != nil && oldNotNull != *column.New.NotNull {
		if *column.New.NotNull {
			queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" SET NOT NULL`,
				alter, *column.Old.Name))
		} else {
			queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" DROP NOT NULL`,
				alter, *column.Old.Name))
		}
	}

	oldDefault := lo.FromPtr(column.Old.Default)

	newDefault := lo.FromPtr(column.New.Default)
	if oldDefault != newDefault {
		if newDefault != "" {
			queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" SET DEFAULT %s`,
				alter, *column.Old.Name, newDefault))
		} else {
			queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" DROP DEFAULT`,
				alter, *column.Old.Name))
		}
	}

	oldComment := lo.FromPtr(column.Old.Comment)

	newComment := lo.FromPtr(column.New.Comment)
	if oldComment != newComment {
		queries = append(queries, fmt.Sprintf(`COMMENT ON COLUMN "%s"."%s"."%s" IS '%s'`,
			node.Schema, node.Table, *column.Old.Name, newComment))
	}

	return queries
}

func resolveCreateTableNode(node contract.DBNode, action contract.TreeNodeActionName, data []byte) contract.DBNode {
	if action != contract.CreateTableAction || node.Table != string(contract.TableContainerNodeType) {
		return node
	}

	tableParams, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableParams](data)
	if err != nil {
		return node
	}

	params := tableParams[contract.GeneralTab]
	if params == nil || params.New == nil || params.New.Name == nil {
		return node
	}

	node.Table = *params.New.Name

	return node
}
