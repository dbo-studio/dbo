package databaseMysql

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func buildMysqlCreateTableQuery(node contract.DBNode, params []byte) (string, string, error) {
	tableParams, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableParams](params)
	if err != nil {
		return "", "", err
	}

	general := tableParams[contract.GeneralTab]
	if general == nil || general.New == nil || general.New.Name == nil {
		return "", "", fmt.Errorf("missing table name")
	}

	tableName := *general.New.Name
	columnParams, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.MysqlTableColumnParams](params)
	if err != nil {
		return "", "", err
	}

	keyParams, _ := helper.ConvertToDTO[map[contract.TreeTab]*dto.MysqlTableKeyParams](params)

	columnDefs := make([]string, 0)
	if columnParams != nil && columnParams[contract.TableColumnsTab] != nil {
		for _, column := range columnParams[contract.TableColumnsTab].Columns {
			if column.New == nil || column.New.Name == nil || column.New.DataType == nil {
				continue
			}

			if def := buildMysqlInlineColumnDefinition(column.New); def != "" {
				columnDefs = append(columnDefs, def)
			}
		}
	}

	if keyParams != nil && keyParams[contract.TableKeysTab] != nil {
		for _, key := range keyParams[contract.TableKeysTab].Columns {
			if key.New == nil || key.New.ConstraintType == nil || len(key.New.Columns) == 0 {
				continue
			}

			constraintType := strings.ToUpper(*key.New.ConstraintType)
			cols := strings.Join(key.New.Columns, "`, `")

			switch constraintType {
			case "PRIMARY KEY", "PRIMARY":
				columnDefs = append(columnDefs, fmt.Sprintf("PRIMARY KEY (`%s`)", cols))
			case "UNIQUE":
				constraintName := lo.FromPtr(key.New.ConstraintName)
				if constraintName == "" {
					constraintName = "uniq_key"
				}
				columnDefs = append(columnDefs, fmt.Sprintf("CONSTRAINT `%s` UNIQUE (`%s`)", constraintName, cols))
			}
		}
	}

	query := fmt.Sprintf("CREATE TABLE `%s`.`%s` (%s)", node.Database, tableName, strings.Join(columnDefs, ", "))
	if general.New.Comment != nil && *general.New.Comment != "" {
		query += fmt.Sprintf(" COMMENT='%s'", *general.New.Comment)
	}

	return query, tableName, nil
}

func buildMysqlInlineColumnDefinition(column *dto.MysqlTableColumnData) string {
	if column == nil || column.Name == nil || column.DataType == nil {
		return ""
	}

	def := fmt.Sprintf("`%s` %s", *column.Name, *column.DataType)

	if column.MaxLength != nil && *column.MaxLength != "" {
		if isCharacterType(*column.DataType) {
			def = fmt.Sprintf("%s(%s)", def, *column.MaxLength)
		} else if isNumericType(*column.DataType) && column.NumericScale != nil {
			def = fmt.Sprintf("%s(%s,%s)", def, *column.MaxLength, *column.NumericScale)
		}
	}

	if lo.FromPtr(column.NotNull) {
		def += " NOT NULL"
	}

	if column.Default != nil && *column.Default != "" {
		def += fmt.Sprintf(" DEFAULT %s", *column.Default)
	}

	if column.Comment != nil && *column.Comment != "" {
		def += fmt.Sprintf(" COMMENT '%s'", *column.Comment)
	}

	return def
}
