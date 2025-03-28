package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
)

func (r *PostgresRepository) handleForeignKeyCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if tabId != contract.TableForeignKeysTab || node.Table == "" || (action != contract.CreateTableAction && action != contract.EditTableAction) {
		return queries, nil
	}

	paramsDto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresTableForeignKeyParams](data)
	if err != nil {
		return nil, err
	}

	params := paramsDto[tabId]

	if action == contract.CreateTableAction {
		for _, column := range params.Columns {
			columnDef := fmt.Sprintf("ALTER TABLE %s ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s(%s)",
				node.Table,
				*column.ConstraintName,
				strings.Join(column.SourceColumns, ","),
				*column.TargetTable,
				strings.Join(column.TargetColumns, ","),
			)

			if column.OnUpdate != nil {
				columnDef += fmt.Sprintf(" ON UPDATE %s", *column.OnUpdate)
			}

			if column.OnDelete != nil {
				columnDef += fmt.Sprintf(" ON DELETE %s", *column.OnDelete)
			}

			if lo.FromPtr(column.IsDeferrable) {
				columnDef += " DEFERRABLE"
			}

			if lo.FromPtr(column.InitiallyDeferred) {
				columnDef += " INITIALLY DEFERRED"
			}

			queries = append(queries, columnDef)

			if column.Comment != nil {
				queries = append(queries, fmt.Sprintf("COMMENT ON CONSTRAINT %s ON %s IS '%s'",
					*column.ConstraintName, node.Table, *column.Comment))
			}
		}
	}

	if action == contract.EditTableAction {
		oldFields, err := r.getTableForeignKeys(node)
		if err != nil {
			return nil, err
		}

		for _, column := range params.Columns {
			column = compareAndSetNil(column, oldFields)
			alter := fmt.Sprintf("ALTER TABLE %s", node.Table)

			if lo.FromPtr(column.Deleted) {
				queries = append(queries, fmt.Sprintf("%s DROP CONSTRAINT %s", alter, *column.ConstraintName))
				continue
			}

			if column.ConstraintName != nil {
				if lo.FromPtr(column.Added) {
					queries = append(queries, fmt.Sprintf("%s ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s(%s)",
						alter,
						*column.ConstraintName,
						strings.Join(column.SourceColumns, ","),
						*column.TargetTable,
						strings.Join(column.TargetColumns, ",")))
				} else {
					queries = append(queries, fmt.Sprintf("%s RENAME CONSTRAINT %s TO %s", alter, findField(oldFields, "constraint_name"), *column.ConstraintName))
				}
			}

			if column.SourceColumns != nil || column.TargetTable != nil || column.TargetColumns != nil {
				queries = append(queries, fmt.Sprintf("%s DROP CONSTRAINT %s, ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s(%s)",
					alter,
					*column.ConstraintName,
					*column.ConstraintName,
					strings.Join(column.SourceColumns, ","),
					*column.TargetTable,
					strings.Join(column.TargetColumns, ",")))
			}

			if column.IsDeferrable != nil {
				if *column.IsDeferrable {
					queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s DEFERRABLE", alter, *column.ConstraintName))
				} else {
					queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s NOT DEFERRABLE", alter, *column.ConstraintName))
				}
			}

			if column.InitiallyDeferred != nil {
				if *column.InitiallyDeferred {
					queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s INITIALLY DEFERRED", alter, *column.ConstraintName))
				} else {
					queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s INITIALLY IMMEDIATE", alter, *column.ConstraintName))
				}
			}

			if column.OnUpdate != nil {
				queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s ON UPDATE %s", alter, *column.ConstraintName, *column.OnUpdate))
			}

			if column.OnDelete != nil {
				queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s ON DELETE %s", alter, *column.ConstraintName, *column.OnDelete))
			}

			if column.Comment != nil && *column.Comment != "" {
				commentQuery := fmt.Sprintf("COMMENT ON CONSTRAINT %s ON %s IS '%s'",
					*column.ConstraintName, node.Table, *column.Comment)
				queries = append(queries, commentQuery)
			}
		}
	}

	return queries, nil
}
