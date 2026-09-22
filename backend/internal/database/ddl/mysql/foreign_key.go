package ddlMysql

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func foreignKeyStatements(database, tableName string, rows []dto.MysqlTableForeignKey, action contract.TreeNodeActionName) []ddl.Statement {
	tableRef := quote.MysqlQualifiedTable(database, tableName)
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

			continue
		}

		if lo.FromPtr(row.Deleted) {
			name := row.New.ConstraintName
			if row.Old != nil && row.Old.ConstraintName != nil {
				name = row.Old.ConstraintName
			}

			if name != nil && *name != "" {
				add(alter + " DROP FOREIGN KEY " + quote.MysqlIdent(*name))
			}

			continue
		}

		if row.Old == nil || row.Old.ConstraintName == nil || row.New.ConstraintName == nil {
			continue
		}

		if foreignKeyChanged(row.Old, row.New) {
			add(alter + " DROP FOREIGN KEY " + quote.MysqlIdent(*row.Old.ConstraintName))

			if query := addForeignKeyStatement(alter, row.New); query != "" {
				add(query)
			}
		}
	}

	return statements
}

func addForeignKeyStatement(alter string, fk *dto.MysqlTableForeignKeyData) string {
	if fk == nil || fk.ConstraintName == nil || fk.TargetTable == nil {
		return ""
	}

	query := alter + " ADD CONSTRAINT " + quote.MysqlIdent(*fk.ConstraintName) +
		" FOREIGN KEY (" + ddl.JoinQuoted(fk.SourceColumns, quote.MysqlIdent) + ")" +
		" REFERENCES " + quote.MysqlIdent(*fk.TargetTable) +
		" (" + ddl.JoinQuoted(fk.TargetColumns, quote.MysqlIdent) + ")"

	if action := ddl.ReferentialAction(lo.FromPtr(fk.OnUpdate)); action != "" {
		query += " ON UPDATE " + action
	}

	if action := ddl.ReferentialAction(lo.FromPtr(fk.OnDelete)); action != "" {
		query += " ON DELETE " + action
	}

	return query
}

func foreignKeyChanged(oldFK, newFK *dto.MysqlTableForeignKeyData) bool {
	if *oldFK.ConstraintName != *newFK.ConstraintName {
		return true
	}

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
