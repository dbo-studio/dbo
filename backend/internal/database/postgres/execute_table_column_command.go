package databasePostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *PostgresRepository) handleTableColumnCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if tabId != contract.TableColumnsTab || node.Table == "" || (action != contract.CreateTableAction && action != contract.EditTableAction) {
		return queries, nil
	}

	paramsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableColumnParams](data)
	if err != nil {
		return nil, err
	}

	params := paramsDto[tabId]

	if action == contract.CreateTableAction {
		for _, column := range params.Columns {
			queries = append(queries, handleCreateColumn(node, column)...)
		}
	}

	if action == contract.EditTableAction {
		for _, column := range params.Columns {
			if column.New == nil {
				continue
			}

			if lo.FromPtr(column.Added) {
				queries = append(queries, handleCreateColumn(node, column)...)
			} else {
				queries = append(queries, handleEditColumn(node, column)...)
			}
		}
	}

	return queries, nil
}

func handleCreateColumn(node PGNode, column dto.PostgresTableColumn) []string {
	queries := []string{}

	columnDef := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", node.Table, *column.New.Name, *column.New.DataType)

	if column.New.MaxLength != nil {
		columnDef = fmt.Sprintf("%s(%d)", columnDef, *column.New.MaxLength)
	}

	if column.New.NumericScale != nil {
		columnDef = fmt.Sprintf("%s(%d,%s)", columnDef, *column.New.MaxLength, *column.New.NumericScale)
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
			node.Table, *column.New.Name, *column.New.Comment))
	}

	return queries
}

func handleEditColumn(node PGNode, column dto.PostgresTableColumn) []string {
	queries := []string{}

	alter := fmt.Sprintf(`ALTER TABLE "%s"."%s" `, node.Schema, node.Table)

	if lo.FromPtr(column.Deleted) {
		queries = append(queries, fmt.Sprintf("%s DROP COLUMN %s", alter, *column.New.Name))
		return queries
	}

	if column.Old.Name != nil && column.New.Name != nil {
		queries = append(queries, fmt.Sprintf(`%s RENAME COLUMN "%s" TO "%s"`, alter, *column.Old.Name, *column.New.Name))
		column.Old.Name = column.New.Name
	}

	if column.Old.Name == nil && column.New.Name != nil {
		column.Old.Name = column.New.Name
	}

	if column.Old.DataType != nil && column.New.DataType != nil {
		dataTypeQuery := fmt.Sprintf(`%s ALTER COLUMN "%s" TYPE %s USING "%s"::%s`,
			alter, *column.Old.Name, *column.New.DataType, *column.Old.Name, *column.New.DataType)

		if column.New.MaxLength != nil {
			if isCharacterType(*column.New.DataType) {
				dataTypeQuery = fmt.Sprintf("%s(%d)", dataTypeQuery, *column.New.MaxLength)
			} else if isNumericType(*column.New.DataType) && column.New.NumericScale != nil {
				dataTypeQuery = fmt.Sprintf("%s(%d,%s)", dataTypeQuery, *column.New.MaxLength, *column.New.NumericScale)
			}
		}

		queries = append(queries, dataTypeQuery)
	}

	if column.Old.NotNull != nil && column.New.NotNull != nil {
		if *column.New.NotNull {
			queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" SET NOT NULL`,
				alter, *column.Old.Name))
		} else {
			queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" DROP NOT NULL`,
				alter, *column.Old.Name))
		}
	}

	if column.Old.Default != nil && column.New.Default != nil {
		if *column.New.Default != "" {
			queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" SET DEFAULT %s`,
				alter, *column.Old.Name, *column.New.Default))
		} else {
			queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" DROP DEFAULT`,
				alter, *column.Old.Name))
		}
	}

	if column.Old.Comment != nil && column.New.Comment != nil {
		commentQuery := fmt.Sprintf("COMMENT ON COLUMN %s.%s IS '%s'",
			node.Table, *column.Old.Name, *column.New.Comment)
		queries = append(queries, commentQuery)
	}

	return queries
}
