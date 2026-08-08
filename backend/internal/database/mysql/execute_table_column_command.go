package databaseMysql

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *MySQLRepository) handleTableColumnCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	node = resolveCreateTableNode(node, action, data)

	if action == contract.CreateTableAction {
		return queries, nil
	}

	if tabID != contract.TableColumnsTab || node.Table == "" || action != contract.EditTableAction {
		return queries, nil
	}

	paramsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.MysqlTableColumnParams](data)
	if err != nil {
		return nil, err
	}

	params := paramsDto[tabID]

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

func (r *MySQLRepository) handleCreateColumn(node contract.DBNode, column dto.MysqlTableColumn) []string {
	queries := []string{}

	columnDef := fmt.Sprintf("ALTER TABLE `%s`.`%s` ADD COLUMN `%s` %s", node.Database, node.Table, *column.New.Name, formatMysqlColumnType(*column.New.DataType, column.New.MaxLength, column.New.NumericScale))

	if lo.FromPtr(column.New.NotNull) {
		columnDef += " NOT NULL"
	}

	if column.New.Default != nil && *column.New.Default != "" {
		columnDef += fmt.Sprintf(" DEFAULT %s", formatMysqlDefault(*column.New.Default))
	}

	if column.New.Comment != nil && *column.New.Comment != "" {
		columnDef += fmt.Sprintf(" COMMENT '%s'", *column.New.Comment)
	}

	queries = append(queries, columnDef)

	return queries
}

func (r *MySQLRepository) handleEditColumn(node contract.DBNode, column dto.MysqlTableColumn) []string {
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

	colType := mysqlEditColumnType(column)
	oldNotNull := lo.FromPtr(column.Old.NotNull)
	notNullChanged := column.New.NotNull != nil && oldNotNull != *column.New.NotNull
	typeChanged := column.Old.DataType != nil && column.New.DataType != nil &&
		!strings.EqualFold(*column.Old.DataType, *column.New.DataType)

	oldDefault := lo.FromPtr(column.Old.Default)
	newDefault := lo.FromPtr(column.New.Default)
	defaultChanged := oldDefault != newDefault

	oldComment := lo.FromPtr(column.Old.Comment)
	newComment := lo.FromPtr(column.New.Comment)
	commentChanged := oldComment != newComment

	if typeChanged || notNullChanged || commentChanged {
		queries = append(queries, fmt.Sprintf("%s MODIFY COLUMN `%s` %s",
			alter, *column.Old.Name, mysqlEditColumnDefinition(column, colType)))
	}

	if defaultChanged {
		if newDefault != "" {
			queries = append(queries, fmt.Sprintf("%s ALTER COLUMN `%s` SET DEFAULT %s",
				alter, *column.Old.Name, formatMysqlDefault(newDefault)))
		} else {
			queries = append(queries, fmt.Sprintf("%s ALTER COLUMN `%s` DROP DEFAULT",
				alter, *column.Old.Name))
		}
	}

	return queries
}

func mysqlEditColumnType(column dto.MysqlTableColumn) string {
	if column.New != nil && column.New.DataType != nil {
		return formatMysqlColumnType(*column.New.DataType, column.New.MaxLength, column.New.NumericScale)
	}

	if column.Old != nil && column.Old.DataType != nil {
		return formatMysqlColumnType(*column.Old.DataType, column.Old.MaxLength, column.Old.NumericScale)
	}

	return ""
}

func mysqlEditColumnDefinition(column dto.MysqlTableColumn, colType string) string {
	def := colType

	if column.New != nil && column.New.NotNull != nil {
		if *column.New.NotNull {
			def += " NOT NULL"
		} else {
			def += " NULL"
		}
	} else if lo.FromPtr(column.Old.NotNull) {
		def += " NOT NULL"
	}

	if column.New != nil && column.New.Default != nil && *column.New.Default != "" {
		def += fmt.Sprintf(" DEFAULT %s", formatMysqlDefault(*column.New.Default))
	}

	if column.New != nil && column.New.Comment != nil && *column.New.Comment != "" {
		escaped := strings.ReplaceAll(*column.New.Comment, "'", "''")
		def += fmt.Sprintf(" COMMENT '%s'", escaped)
	}

	return def
}
