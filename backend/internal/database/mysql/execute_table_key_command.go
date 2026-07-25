package databaseMysql

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *MySQLRepository) handleTableKeyCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if action == contract.CreateTableAction {
		return queries, nil
	}

	if tabID != contract.TableKeysTab || node.Table == "" || action != contract.EditTableAction {
		return queries, nil
	}

	paramsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.MysqlTableKeyParams](data)
	if err != nil {
		return nil, err
	}

	params := paramsDto[tabID]
	if params == nil {
		return queries, nil
	}

	alter := fmt.Sprintf("ALTER TABLE `%s`.`%s`", node.Database, node.Table)

	for _, key := range params.Columns {
		if key.New == nil {
			continue
		}

		if lo.FromPtr(key.Added) {
			query := buildAddKeyQuery(alter, key.New)
			if query != "" {
				queries = append(queries, query)
			}
			continue
		}

		if lo.FromPtr(key.Deleted) && key.Old != nil {
			query := buildDropKeyQuery(alter, key.Old)
			if query != "" {
				queries = append(queries, query)
			}
		}
	}

	return queries, nil
}

func buildAddKeyQuery(alter string, key *dto.MysqlTableKeyData) string {
	if key == nil || len(key.Columns) == 0 || key.ConstraintType == nil {
		return ""
	}

	cols := strings.Join(key.Columns, "`, `")
	constraintType := strings.ToUpper(*key.ConstraintType)

	if constraintType == "PRIMARY KEY" || constraintType == "PRIMARY" {
		return fmt.Sprintf("%s ADD PRIMARY KEY (`%s`)", alter, cols)
	}

	constraintName := lo.FromPtr(key.ConstraintName)
	if constraintName == "" {
		constraintName = "uniq_key"
	}

	if constraintType == "UNIQUE" {
		return fmt.Sprintf("%s ADD CONSTRAINT `%s` UNIQUE (`%s`)", alter, constraintName, cols)
	}

	return ""
}

func buildDropKeyQuery(alter string, key *dto.MysqlTableKeyData) string {
	if key == nil || key.ConstraintType == nil {
		return ""
	}

	constraintType := strings.ToUpper(*key.ConstraintType)
	if constraintType == "PRIMARY KEY" || constraintType == "PRIMARY" {
		return fmt.Sprintf("%s DROP PRIMARY KEY", alter)
	}

	if key.ConstraintName != nil && *key.ConstraintName != "" {
		return fmt.Sprintf("%s DROP INDEX `%s`", alter, *key.ConstraintName)
	}

	return ""
}
