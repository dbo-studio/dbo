package databaseMysql

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *MySQLRepository) handleForeignKeyCommands(node MySQLNode, tabId contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if tabId != contract.TableForeignKeysTab || node.Table == "" || (action != contract.CreateTableAction && action != contract.EditTableAction) {
		return queries, nil
	}

	paramsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableForeignKeyParams](data)
	if err != nil {
		return nil, err
	}

	params := paramsDto[tabId]

	if action == contract.CreateTableAction {
		for _, column := range params.Columns {
			columnDef := fmt.Sprintf("ALTER TABLE `%s`.`%s` ADD CONSTRAINT `%s` FOREIGN KEY (`%s`) REFERENCES `%s`(`%s`)",
				node.Database,
				node.Table,
				*column.New.ConstraintName,
				strings.Join(column.New.SourceColumns, "`, `"),
				*column.New.TargetTable,
				strings.Join(column.New.TargetColumns, "`, `"),
			)

			if column.New.OnUpdate != nil && *column.New.OnUpdate != "" {
				columnDef += fmt.Sprintf(" ON UPDATE %s", *column.New.OnUpdate)
			}

			if column.New.OnDelete != nil && *column.New.OnDelete != "" {
				columnDef += fmt.Sprintf(" ON DELETE %s", *column.New.OnDelete)
			}

			queries = append(queries, columnDef)
		}
	}

	if action == contract.EditTableAction {
		for _, column := range params.Columns {
			alter := fmt.Sprintf("ALTER TABLE `%s`.`%s`", node.Database, node.Table)

			if lo.FromPtr(column.Deleted) {
				queries = append(queries, fmt.Sprintf("%s DROP FOREIGN KEY `%s`", alter, *column.Old.ConstraintName))
				continue
			}

			if lo.FromPtr(column.Added) {
				columnDef := fmt.Sprintf("%s ADD CONSTRAINT `%s` FOREIGN KEY (`%s`) REFERENCES `%s`(`%s`)",
					alter,
					*column.New.ConstraintName,
					strings.Join(column.New.SourceColumns, "`, `"),
					*column.New.TargetTable,
					strings.Join(column.New.TargetColumns, "`, `"),
				)

				if column.New.OnUpdate != nil && *column.New.OnUpdate != "" {
					columnDef += fmt.Sprintf(" ON UPDATE %s", *column.New.OnUpdate)
				}

				if column.New.OnDelete != nil && *column.New.OnDelete != "" {
					columnDef += fmt.Sprintf(" ON DELETE %s", *column.New.OnDelete)
				}

				queries = append(queries, columnDef)
				continue
			}

			if column.Old.ConstraintName != nil && column.New.ConstraintName != nil && *column.Old.ConstraintName != *column.New.ConstraintName {
				queries = append(queries, fmt.Sprintf("%s DROP FOREIGN KEY `%s`", alter, *column.Old.ConstraintName))
				columnDef := fmt.Sprintf("%s ADD CONSTRAINT `%s` FOREIGN KEY (`%s`) REFERENCES `%s`(`%s`)",
					alter,
					*column.New.ConstraintName,
					strings.Join(column.New.SourceColumns, "`, `"),
					*column.New.TargetTable,
					strings.Join(column.New.TargetColumns, "`, `"),
				)

				if column.New.OnUpdate != nil && *column.New.OnUpdate != "" {
					columnDef += fmt.Sprintf(" ON UPDATE %s", *column.New.OnUpdate)
				}

				if column.New.OnDelete != nil && *column.New.OnDelete != "" {
					columnDef += fmt.Sprintf(" ON DELETE %s", *column.New.OnDelete)
				}

				queries = append(queries, columnDef)
			}
		}
	}

	return queries, nil
}
