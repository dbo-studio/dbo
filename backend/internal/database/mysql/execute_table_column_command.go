package databaseMysql

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *MySQLRepository) handleTableColumnCommands(node MySQLNode, tabId contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if tabId != contract.TableColumnsTab || node.Table == "" || (action != contract.CreateTableAction && action != contract.EditTableAction) {
		return queries, nil
	}

	paramsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.MysqlTableColumnParams](data)
	if err != nil {
		return nil, err
	}

	params := paramsDto[tabId]

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

func (r *MySQLRepository) handleCreateColumn(node MySQLNode, column dto.MysqlTableColumn) []string {
	queries := []string{}

	columnDef := fmt.Sprintf("ALTER TABLE `%s`.`%s` ADD COLUMN `%s` %s", node.Database, node.Table, *column.New.Name, *column.New.DataType)

	if column.New.MaxLength != nil && *column.New.MaxLength != "" {
		if isCharacterType(*column.New.DataType) {
			columnDef = fmt.Sprintf("%s(%s)", columnDef, *column.New.MaxLength)
		} else if isNumericType(*column.New.DataType) && column.New.NumericScale != nil {
			columnDef = fmt.Sprintf("%s(%s,%s)", columnDef, *column.New.MaxLength, *column.New.NumericScale)
		}
	}

	if lo.FromPtr(column.New.NotNull) {
		columnDef += " NOT NULL"
	}

	if column.New.Default != nil && *column.New.Default != "" {
		columnDef += fmt.Sprintf(" DEFAULT %s", *column.New.Default)
	}

	if column.New.Comment != nil && *column.New.Comment != "" {
		columnDef += fmt.Sprintf(" COMMENT '%s'", *column.New.Comment)
	}

	queries = append(queries, columnDef)

	return queries
}

func (r *MySQLRepository) handleEditColumn(node MySQLNode, column dto.MysqlTableColumn) []string {
	queries := []string{}

	alter := fmt.Sprintf("ALTER TABLE `%s`.`%s`", node.Database, node.Table)

	if lo.FromPtr(column.Deleted) {
		queries = append(queries, fmt.Sprintf("%s DROP COLUMN `%s`", alter, *column.New.Name))
		return queries
	}

	if column.Old.Name != nil && column.New.Name != nil && *column.Old.Name != *column.New.Name {
		queries = append(queries, fmt.Sprintf("%s RENAME COLUMN `%s` TO `%s`", alter, *column.Old.Name, *column.New.Name))
		column.Old.Name = column.New.Name
	}

	if column.Old.Name == nil && column.New.Name != nil {
		column.Old.Name = column.New.Name
	}

	if column.Old.DataType != nil && column.New.DataType != nil && *column.Old.DataType != *column.New.DataType {
		dataTypeQuery := fmt.Sprintf("%s MODIFY COLUMN `%s` %s",
			alter, *column.Old.Name, *column.New.DataType)

		if column.New.MaxLength != nil {
			if isCharacterType(*column.New.DataType) {
				dataTypeQuery = fmt.Sprintf("%s(%s)", dataTypeQuery, *column.New.MaxLength)
			} else if isNumericType(*column.New.DataType) && column.New.NumericScale != nil {
				dataTypeQuery = fmt.Sprintf("%s(%s,%s)", dataTypeQuery, *column.New.MaxLength, *column.New.NumericScale)
			}
		}

		queries = append(queries, dataTypeQuery)
	}

	if column.Old.NotNull != nil && column.New.NotNull != nil && *column.Old.NotNull != *column.New.NotNull {
		if *column.New.NotNull {
			queries = append(queries, fmt.Sprintf("%s MODIFY COLUMN `%s` NOT NULL",
				alter, *column.Old.Name))
		} else {
			queries = append(queries, fmt.Sprintf("%s MODIFY COLUMN `%s` NULL",
				alter, *column.Old.Name))
		}
	}

	if column.Old.Default != nil && column.New.Default != nil && *column.Old.Default != *column.New.Default {
		if *column.New.Default != "" {
			queries = append(queries, fmt.Sprintf("%s ALTER COLUMN `%s` SET DEFAULT %s",
				alter, *column.Old.Name, *column.New.Default))
		} else {
			queries = append(queries, fmt.Sprintf("%s ALTER COLUMN `%s` DROP DEFAULT",
				alter, *column.Old.Name))
		}
	}

	if column.Old.Comment != nil && column.New.Comment != nil && *column.Old.Comment != *column.New.Comment {
		commentQuery := fmt.Sprintf("%s MODIFY COLUMN `%s` COMMENT '%s'",
			alter, *column.Old.Name, *column.New.Comment)
		queries = append(queries, commentQuery)
	}

	return queries
}
