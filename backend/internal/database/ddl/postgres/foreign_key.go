package ddlPostgres

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

// foreignKeyStatements builds the foreign keys phase. For create-table rows
// (or rows marked added) it emits ADD CONSTRAINT; material changes on edit
// drop + recreate the constraint; renames and deferrability toggles alter
// in place.
func foreignKeyStatements(schema, tableName string, rows []dto.PostgresTableForeignKey, action contract.TreeNodeActionName) []ddl.Statement {
	tableRef := quote.PostgresQualifiedTable(schema, tableName)
	alter := "ALTER TABLE " + tableRef

	var statements []ddl.Statement

	add := func(sql string) {
		statements = append(statements, ddl.Statement{SQL: sql, Phase: ddl.PhaseForeignKeys})
	}

	for _, row := range rows {
		if row.New == nil {
			continue
		}

		if action == contract.CreateTableAction || lo.FromPtr(row.Added) {
			if query := addForeignKeyStatement(alter, row.New); query != "" {
				add(query)
			}

			if row.New.Comment != nil && *row.New.Comment != "" && row.New.ConstraintName != nil {
				add(commentOnConstraintStatement(*row.New.ConstraintName, schema, tableName, *row.New.Comment).SQL)
			}

			continue
		}

		if lo.FromPtr(row.Deleted) {
			name := row.New.ConstraintName
			if row.Old != nil && row.Old.ConstraintName != nil {
				name = row.Old.ConstraintName
			}

			if name != nil && *name != "" {
				add(alter + " DROP CONSTRAINT " + quote.PostgresIdent(*name))
			}

			continue
		}

		if row.Old == nil {
			continue
		}

		if foreignKeyNeedsRecreate(row.Old, row.New) {
			oldName := lo.FromPtr(row.Old.ConstraintName)
			if oldName != "" {
				add(alter + " DROP CONSTRAINT " + quote.PostgresIdent(oldName))
			}

			if query := addForeignKeyStatement(alter, row.New); query != "" {
				add(query)
			}

			continue
		}

		if row.Old.ConstraintName != nil && row.New.ConstraintName != nil &&
			*row.Old.ConstraintName != *row.New.ConstraintName {
			add(alter + " RENAME CONSTRAINT " + quote.PostgresIdent(*row.Old.ConstraintName) +
				" TO " + quote.PostgresIdent(*row.New.ConstraintName))
		}

		if row.New.IsDeferrable != nil && (row.Old.IsDeferrable == nil || *row.New.IsDeferrable != *row.Old.IsDeferrable) {
			keyword := "NOT DEFERRABLE"
			if *row.New.IsDeferrable {
				keyword = "DEFERRABLE"
			}

			add(alter + " ALTER CONSTRAINT " + quote.PostgresIdent(*row.Old.ConstraintName) + " " + keyword)
		}

		if row.New.InitiallyDeferred != nil && (row.Old.InitiallyDeferred == nil || *row.New.InitiallyDeferred != *row.Old.InitiallyDeferred) {
			keyword := "INITIALLY IMMEDIATE"
			if *row.New.InitiallyDeferred {
				keyword = "INITIALLY DEFERRED"
			}

			add(alter + " ALTER CONSTRAINT " + quote.PostgresIdent(*row.Old.ConstraintName) + " " + keyword)
		}

		if row.New.Comment != nil && *row.New.Comment != "" && row.Old.ConstraintName != nil {
			add(commentOnConstraintStatement(*row.Old.ConstraintName, schema, tableName, *row.New.Comment).SQL)
		}
	}

	return statements
}

func addForeignKeyStatement(alter string, fk *dto.PostgresTableForeignKeyData) string {
	if fk == nil || fk.ConstraintName == nil || fk.TargetTable == nil {
		return ""
	}

	query := alter + " ADD CONSTRAINT " + quote.PostgresIdent(*fk.ConstraintName) +
		" FOREIGN KEY (" + quoteJoinColumns(fk.SourceColumns) + ")" +
		" REFERENCES " + quote.PostgresIdent(*fk.TargetTable) +
		" (" + quoteJoinColumns(fk.TargetColumns) + ")"

	if fk.OnUpdate != nil {
		query += " ON UPDATE " + *fk.OnUpdate
	}

	if fk.OnDelete != nil {
		query += " ON DELETE " + *fk.OnDelete
	}

	if lo.FromPtr(fk.IsDeferrable) {
		query += " DEFERRABLE"
	}

	if lo.FromPtr(fk.InitiallyDeferred) {
		query += " INITIALLY DEFERRED"
	}

	return query
}

func foreignKeyNeedsRecreate(oldFK, newFK *dto.PostgresTableForeignKeyData) bool {
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
