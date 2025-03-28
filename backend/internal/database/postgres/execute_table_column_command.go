package databasePostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
)

func (r *PostgresRepository) handleTableColumnCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if tabId != contract.TableColumnsTab || node.Table == "" || (action != contract.CreateTableAction && action != contract.EditTableAction) {
		return queries, nil
	}

	paramsDto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresTableColumnParams](data)
	if err != nil {
		return nil, err
	}

	params := paramsDto[tabId]

	if action == contract.CreateTableAction {
		for _, column := range params.Columns {
			columnDef := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", node.Table, *column.Name, *column.DataType)

			if column.MaxLength != nil {
				columnDef = fmt.Sprintf("%s(%s)", columnDef, *column.MaxLength)
			}

			if column.NumericScale != nil {
				columnDef = fmt.Sprintf("%s(%s,%s)", columnDef, *column.MaxLength, *column.NumericScale)
			}

			if lo.FromPtr(column.NotNull) {
				columnDef += " NOT NULL"
			}

			if lo.FromPtr(column.Primary) {
				columnDef += " PRIMARY KEY"
			}

			if column.Default != nil {
				columnDef += fmt.Sprintf(" DEFAULT %s", *column.Default)
			}

			if lo.FromPtr(column.IsIdentity) {
				columnDef += " GENERATED ALWAYS AS IDENTITY"
			}

			if lo.FromPtr(column.IsGenerated) {
				if column.Default != nil {
					columnDef += fmt.Sprintf(" GENERATED ALWAYS AS (%s) STORED", *column.Default)
				}
			}

			queries = append(queries, columnDef)

			if column.Comment != nil {
				queries = append(queries, fmt.Sprintf("COMMENT ON COLUMN %s.%s IS '%s'",
					node.Table, *column.Name, *column.Comment))
			}
		}
	}

	if action == contract.EditTableAction {
		oldFields, err := r.getTableColumns(node)
		if err != nil {
			return queries, err
		}

		for _, column := range params.Columns {
			column := compareAndSetNil(column, oldFields)

			alter := fmt.Sprintf(`ALTER TABLE "%s"."%s" `, node.Schema, node.Table)

			if lo.FromPtr(column.Deleted) {
				queries = append(queries, fmt.Sprintf("%s DROP COLUMN %s", alter, *column.Name))
				continue
			}

			if column.Name != nil {
				if lo.FromPtr(column.Added) {
					queries = append(queries, fmt.Sprintf(`%s ADD COLUMN %s`, alter, *column.Name))
				} else {
					queries = append(queries, fmt.Sprintf(`%s RENAME COLUMN "%s" TO "%s"`, alter, findField(oldFields, "column_name"), *column.Name))
				}
			}

			if column.DataType != nil {
				dataTypeQuery := fmt.Sprintf(`%s ALTER COLUMN "%s" TYPE %s USING "%s"::%s`,
					alter, *column.Name, *column.DataType, *column.Name, *column.DataType)

				if column.MaxLength != nil && *column.MaxLength != "" {
					if isCharacterType(*column.DataType) {
						dataTypeQuery = fmt.Sprintf("%s(%s)", dataTypeQuery, *column.MaxLength)
					} else if isNumericType(*column.DataType) && column.NumericScale != nil {
						dataTypeQuery = fmt.Sprintf("%s(%s,%s)", dataTypeQuery, *column.MaxLength, *column.NumericScale)
					}
				}

				queries = append(queries, dataTypeQuery)
			}

			if column.NotNull != nil {
				if *column.NotNull {
					queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" SET NOT NULL`,
						alter, *column.Name))
				} else {
					queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" DROP NOT NULL`,
						alter, *column.Name))
				}
			}

			if column.Default != nil {
				if *column.Default != "" {
					queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" SET DEFAULT %s`,
						alter, *column.Name, *column.Default))
				} else {
					queries = append(queries, fmt.Sprintf(`%s ALTER COLUMN "%s" DROP DEFAULT`,
						alter, *column.Name))
				}
			}

			if column.Comment != nil {
				commentQuery := fmt.Sprintf("COMMENT ON COLUMN %s.%s IS '%s'",
					node.Table, *column.Name, *column.Comment)
				queries = append(queries, commentQuery)
			}
		}
	}

	return queries, nil
}
