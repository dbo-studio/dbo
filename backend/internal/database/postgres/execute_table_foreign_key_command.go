package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
)

func (r *PostgresRepository) handleForeignKeyCommands(node PGNode, tableName string, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	queries := []string{}

	if tabId != contract.TableForeignKeysTab || node.Table == "" {
		return queries, nil
	}

	oldFields, err := r.getTableForeignKeys(node)
	if err != nil {
		return nil, err
	}

	if action == contract.CreateTableAction {
		dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresTableForeignKeyParams](params)
		if err != nil {
			return nil, err
		}

		params := dto[tabId]
		for _, column := range params.Columns {
			columnDef := fmt.Sprintf("ALTER TABLE %s ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s(%s)",
				tableName,
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
					*column.ConstraintName, tableName, *column.Comment))
			}
		}
	}

	if action == contract.EditTableAction {
		dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresTableForeignKeyParams](params)
		if err != nil {
			return nil, err
		}

		params := dto[tabId]

		for _, column := range params.Columns {
			if lo.FromPtr(column.Deleted) {
				queries = append(queries, fmt.Sprintf("ALTER TABLE %s DROP CONSTRAINT %s", node.Table, *column.ConstraintName))
				continue
			}

			if column.ConstraintName != nil {
				queries = append(queries, fmt.Sprintf("ALTER TABLE %s RENAME CONSTRAINT %s TO %s", node.Table, findField(oldFields, "Constraint Name"), *column.ConstraintName))
			}

			if column.SourceColumns != nil || column.TargetTable != nil || column.TargetColumns != nil {
				queries = append(queries, fmt.Sprintf("ALTER TABLE %s DROP CONSTRAINT %s, ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s(%s)",
					node.Table,
					*column.ConstraintName,
					*column.ConstraintName,
					strings.Join(column.SourceColumns, ","),
					*column.TargetTable,
					strings.Join(column.TargetColumns, ",")))
			}

			if column.IsDeferrable != nil {
				if *column.IsDeferrable {
					queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER CONSTRAINT %s DEFERRABLE", node.Table, *column.ConstraintName))
				} else {
					queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER CONSTRAINT %s NOT DEFERRABLE", node.Table, *column.ConstraintName))
				}
			}

			if column.InitiallyDeferred != nil {
				if *column.InitiallyDeferred {
					queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER CONSTRAINT %s INITIALLY DEFERRED", node.Table, *column.ConstraintName))
				} else {
					queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER CONSTRAINT %s INITIALLY IMMEDIATE", node.Table, *column.ConstraintName))
				}
			}

			if column.OnUpdate != nil {
				queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER CONSTRAINT %s ON UPDATE %s", node.Table, *column.ConstraintName, *column.OnUpdate))
			}

			if column.OnDelete != nil {
				queries = append(queries, fmt.Sprintf("ALTER TABLE %s ALTER CONSTRAINT %s ON DELETE %s", node.Table, *column.ConstraintName, *column.OnDelete))
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
