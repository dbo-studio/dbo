package databaseMysql

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *MySQLRepository) handleTableIndexCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if tabID != contract.TableIndexesTab || node.Table == "" || (action != contract.CreateTableAction && action != contract.EditTableAction) {
		return queries, nil
	}

	paramsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.MysqlTableIndexParams](data)
	if err != nil {
		return nil, err
	}

	params := paramsDto[tabID]
	if params == nil {
		return queries, nil
	}

	for _, index := range params.Columns {
		if index.New == nil {
			continue
		}

		if action == contract.CreateTableAction || lo.FromPtr(index.Added) {
			query := buildCreateIndexQuery(node.Database, node.Table, index.New)
			if query != "" {
				queries = append(queries, query)
			}

			continue
		}

		if lo.FromPtr(index.Deleted) && index.Old != nil && index.Old.IndexName != nil {
			queries = append(queries, fmt.Sprintf("DROP INDEX `%s` ON `%s`.`%s`", *index.Old.IndexName, node.Database, node.Table))
		}
	}

	return queries, nil
}

func buildCreateIndexQuery(database, table string, index *dto.MysqlTableIndexData) string {
	if index == nil || index.IndexName == nil || len(index.Columns) == 0 {
		return ""
	}

	unique := ""
	if index.NonUnique != nil && !*index.NonUnique {
		unique = "UNIQUE "
	}

	collation := "A"
	if index.Collation != nil && *index.Collation != "" {
		collation = *index.Collation
	}

	colParts := make([]string, len(index.Columns))
	for i, col := range index.Columns {
		if collation == "D" {
			colParts[i] = fmt.Sprintf("`%s` DESC", col)
		} else {
			colParts[i] = fmt.Sprintf("`%s` ASC", col)
		}
	}

	return fmt.Sprintf("CREATE %sINDEX `%s` ON `%s`.`%s` (%s)",
		unique,
		*index.IndexName,
		database,
		table,
		strings.Join(colParts, ", "),
	)
}
