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
				*column.New.ConstraintName,
				strings.Join(column.New.SourceColumns, ","),
				*column.New.TargetTable,
				strings.Join(column.New.TargetColumns, ","),
			)

			if column.New.OnUpdate != nil {
				columnDef += fmt.Sprintf(" ON UPDATE %s", *column.New.OnUpdate)
			}

			if column.New.OnDelete != nil {
				columnDef += fmt.Sprintf(" ON DELETE %s", *column.New.OnDelete)
			}

			if lo.FromPtr(column.New.IsDeferrable) {
				columnDef += " DEFERRABLE"
			}

			if lo.FromPtr(column.New.InitiallyDeferred) {
				columnDef += " INITIALLY DEFERRED"
			}

			queries = append(queries, columnDef)

			if column.New.Comment != nil {
				queries = append(queries, fmt.Sprintf("COMMENT ON CONSTRAINT %s ON %s IS '%s'",
					*column.New.ConstraintName, node.Table, *column.New.Comment))
			}
		}
	}

	if action == contract.EditTableAction {
		for _, column := range params.Columns {
			alter := fmt.Sprintf("ALTER TABLE %s", node.Table)

			if lo.FromPtr(column.Deleted) {
				queries = append(queries, fmt.Sprintf("%s DROP CONSTRAINT %s", alter, *column.New.ConstraintName))
				continue
			}

			if column.New.ConstraintName != nil {
				if lo.FromPtr(column.Added) {
					queries = append(queries, fmt.Sprintf("%s ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s(%s)",
						alter,
						*column.New.ConstraintName,
						strings.Join(column.New.SourceColumns, ","),
						*column.New.TargetTable,
						strings.Join(column.New.TargetColumns, ",")))
				} else {
					queries = append(queries, fmt.Sprintf("%s RENAME CONSTRAINT %s TO %s", alter, *column.Old.ConstraintName, *column.New.ConstraintName))
				}
			}

			if column.New.SourceColumns != nil || column.New.TargetTable != nil || column.New.TargetColumns != nil {
				queries = append(queries, fmt.Sprintf("%s DROP CONSTRAINT %s, ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s(%s)",
					alter,
					*column.New.ConstraintName,
					*column.New.ConstraintName,
					strings.Join(column.New.SourceColumns, ","),
					*column.New.TargetTable,
					strings.Join(column.New.TargetColumns, ",")))
			}

			if column.New.IsDeferrable != nil {
				if *column.New.IsDeferrable {
					queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s DEFERRABLE", alter, *column.New.ConstraintName))
				} else {
					queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s NOT DEFERRABLE", alter, *column.New.ConstraintName))
				}
			}

			if column.New.InitiallyDeferred != nil {
				if *column.New.InitiallyDeferred {
					queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s INITIALLY DEFERRED", alter, *column.New.ConstraintName))
				} else {
					queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s INITIALLY IMMEDIATE", alter, *column.New.ConstraintName))
				}
			}

			if column.New.OnUpdate != nil {
				queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s ON UPDATE %s", alter, *column.New.ConstraintName, *column.New.OnUpdate))
			}

			if column.New.OnDelete != nil {
				queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s ON DELETE %s", alter, *column.New.ConstraintName, *column.New.OnDelete))
			}

			if column.New.Comment != nil && *column.New.Comment != "" {
				commentQuery := fmt.Sprintf("COMMENT ON CONSTRAINT %s ON %s IS '%s'",
					*column.New.ConstraintName, node.Table, *column.New.Comment)
				queries = append(queries, commentQuery)
			}
		}
	}

	return queries, nil
}
