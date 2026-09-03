package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *PostgresRepository) handleForeignKeyCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	node = resolveCreateTableNode(node, action, data)

	if tabID != contract.TableForeignKeysTab || node.Table == "" || (action != contract.CreateTableAction && action != contract.EditTableAction) {
		return queries, nil
	}

	paramsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableForeignKeyParams](data)
	if err != nil {
		return nil, err
	}

	params := paramsDto[tabID]
	if params == nil {
		return queries, nil
	}

	if action == contract.CreateTableAction {
		for _, column := range params.Columns {
			columnDef := fmt.Sprintf("ALTER TABLE %s ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s(%s)",
				qualifiedTableName(node.Schema, node.Table),
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
			if column.New == nil {
				continue
			}

			alter := fmt.Sprintf("ALTER TABLE %s", qualifiedTableName(node.Schema, node.Table))

			if lo.FromPtr(column.Deleted) {
				name := column.New.ConstraintName
				if column.Old != nil && column.Old.ConstraintName != nil {
					name = column.Old.ConstraintName
				}

				if name != nil {
					queries = append(queries, fmt.Sprintf("%s DROP CONSTRAINT %s", alter, *name))
				}

				continue
			}

			if lo.FromPtr(column.Added) {
				if query := postgresAddForeignKeySQL(alter, column.New); query != "" {
					queries = append(queries, query)
				}

				continue
			}

			if column.Old == nil {
				continue
			}

			nameChanged := column.Old.ConstraintName != nil && column.New.ConstraintName != nil &&
				*column.Old.ConstraintName != *column.New.ConstraintName
			if postgresForeignKeyNeedsRecreate(column.Old, column.New) {
				oldName := lo.FromPtr(column.Old.ConstraintName)
				if oldName != "" {
					queries = append(queries, fmt.Sprintf("%s DROP CONSTRAINT %s", alter, oldName))
				}

				if query := postgresAddForeignKeySQL(alter, column.New); query != "" {
					queries = append(queries, query)
				}

				continue
			}

			if nameChanged {
				queries = append(queries, fmt.Sprintf("%s RENAME CONSTRAINT %s TO %s", alter, *column.Old.ConstraintName, *column.New.ConstraintName))
				column.Old.ConstraintName = column.New.ConstraintName
			}

			if column.New.IsDeferrable != nil && (column.Old.IsDeferrable == nil || *column.New.IsDeferrable != *column.Old.IsDeferrable) {
				if *column.New.IsDeferrable {
					queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s DEFERRABLE", alter, *column.Old.ConstraintName))
				} else {
					queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s NOT DEFERRABLE", alter, *column.Old.ConstraintName))
				}
			}

			if column.New.InitiallyDeferred != nil && (column.Old.InitiallyDeferred == nil || *column.New.InitiallyDeferred != *column.Old.InitiallyDeferred) {
				if *column.New.InitiallyDeferred {
					queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s INITIALLY DEFERRED", alter, *column.Old.ConstraintName))
				} else {
					queries = append(queries, fmt.Sprintf("%s ALTER CONSTRAINT %s INITIALLY IMMEDIATE", alter, *column.Old.ConstraintName))
				}
			}

			if column.New.Comment != nil && *column.New.Comment != "" {
				commentQuery := fmt.Sprintf("COMMENT ON CONSTRAINT %s ON %s IS '%s'",
					*column.Old.ConstraintName, node.Table, *column.New.Comment)
				queries = append(queries, commentQuery)
			}
		}
	}

	return queries, nil
}

func postgresAddForeignKeySQL(alter string, fk *dto.PostgresTableForeignKeyData) string {
	if fk == nil || fk.ConstraintName == nil || fk.TargetTable == nil {
		return ""
	}

	columnDef := fmt.Sprintf("%s ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s(%s)",
		alter,
		*fk.ConstraintName,
		strings.Join(fk.SourceColumns, ","),
		*fk.TargetTable,
		strings.Join(fk.TargetColumns, ","),
	)

	if fk.OnUpdate != nil {
		columnDef += fmt.Sprintf(" ON UPDATE %s", *fk.OnUpdate)
	}

	if fk.OnDelete != nil {
		columnDef += fmt.Sprintf(" ON DELETE %s", *fk.OnDelete)
	}

	if lo.FromPtr(fk.IsDeferrable) {
		columnDef += " DEFERRABLE"
	}

	if lo.FromPtr(fk.InitiallyDeferred) {
		columnDef += " INITIALLY DEFERRED"
	}

	return columnDef
}

func postgresForeignKeyNeedsRecreate(oldFK, newFK *dto.PostgresTableForeignKeyData) bool {
	if newFK.SourceColumns != nil && !stringSlicesEqual(newFK.SourceColumns, oldFK.SourceColumns) {
		return true
	}

	if newFK.TargetColumns != nil && !stringSlicesEqual(newFK.TargetColumns, oldFK.TargetColumns) {
		return true
	}

	if ptrStringChanged(oldFK.TargetTable, newFK.TargetTable) {
		return true
	}

	if ptrStringChanged(oldFK.OnUpdate, newFK.OnUpdate) {
		return true
	}

	if ptrStringChanged(oldFK.OnDelete, newFK.OnDelete) {
		return true
	}

	return false
}

func ptrStringChanged(oldVal, newVal *string) bool {
	if newVal == nil {
		return false
	}

	if oldVal == nil {
		return true
	}

	return *oldVal != *newVal
}

func stringSlicesEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}

	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}

	return true
}
