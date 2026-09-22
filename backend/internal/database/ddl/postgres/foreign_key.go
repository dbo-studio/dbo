package ddlPostgres

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

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

		constraintName := lo.FromPtr(row.Old.ConstraintName)

		if row.Old.ConstraintName != nil && row.New.ConstraintName != nil &&
			*row.Old.ConstraintName != *row.New.ConstraintName {
			add(alter + " RENAME CONSTRAINT " + quote.PostgresIdent(*row.Old.ConstraintName) +
				" TO " + quote.PostgresIdent(*row.New.ConstraintName))
			constraintName = *row.New.ConstraintName
		}

		if constraintName == "" {
			continue
		}

		if row.New.IsDeferrable != nil && (row.Old.IsDeferrable == nil || *row.New.IsDeferrable != *row.Old.IsDeferrable) {
			keyword := "NOT DEFERRABLE"
			if *row.New.IsDeferrable {
				keyword = "DEFERRABLE"
			}

			add(alter + " ALTER CONSTRAINT " + quote.PostgresIdent(constraintName) + " " + keyword)
		}

		if row.New.InitiallyDeferred != nil && (row.Old.InitiallyDeferred == nil || *row.New.InitiallyDeferred != *row.Old.InitiallyDeferred) {
			keyword := "INITIALLY IMMEDIATE"
			if *row.New.InitiallyDeferred {
				keyword = "INITIALLY DEFERRED"
			}

			add(alter + " ALTER CONSTRAINT " + quote.PostgresIdent(constraintName) + " " + keyword)
		}

		if row.New.Comment != nil && *row.New.Comment != "" {
			add(commentOnConstraintStatement(constraintName, schema, tableName, *row.New.Comment).SQL)
		}
	}

	return statements
}

func addForeignKeyStatement(alter string, fk *dto.PostgresTableForeignKeyData) string {
	if fk == nil || fk.ConstraintName == nil || fk.TargetTable == nil {
		return ""
	}

	query := alter + " ADD CONSTRAINT " + quote.PostgresIdent(*fk.ConstraintName) +
		" FOREIGN KEY (" + ddl.JoinQuoted(fk.SourceColumns, quote.PostgresIdent) + ")" +
		" REFERENCES " + quote.PostgresIdent(*fk.TargetTable) +
		" (" + ddl.JoinQuoted(fk.TargetColumns, quote.PostgresIdent) + ")"

	if action := ddl.ReferentialAction(lo.FromPtr(fk.OnUpdate)); action != "" {
		query += " ON UPDATE " + action
	}

	if action := ddl.ReferentialAction(lo.FromPtr(fk.OnDelete)); action != "" {
		query += " ON DELETE " + action
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
	if newFK.SourceColumns != nil && !ddl.StringSlicesEqual(newFK.SourceColumns, oldFK.SourceColumns) {
		return true
	}

	if newFK.TargetColumns != nil && !ddl.StringSlicesEqual(newFK.TargetColumns, oldFK.TargetColumns) {
		return true
	}

	if ddl.PtrStringChanged(oldFK.TargetTable, newFK.TargetTable) {
		return true
	}

	if ddl.PtrStringChanged(oldFK.OnUpdate, newFK.OnUpdate) {
		return true
	}

	if ddl.PtrStringChanged(oldFK.OnDelete, newFK.OnDelete) {
		return true
	}

	return false
}
