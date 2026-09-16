package ddlMysql

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

// foreignKeyStatements builds the foreign keys phase; material changes
// drop + rebuild the constraint.
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
		" FOREIGN KEY (" + quoteJoinColumns(fk.SourceColumns) + ")" +
		" REFERENCES " + quote.MysqlIdent(*fk.TargetTable) +
		" (" + quoteJoinColumns(fk.TargetColumns) + ")"

	if fk.OnUpdate != nil && *fk.OnUpdate != "" {
		query += " ON UPDATE " + *fk.OnUpdate
	}

	if fk.OnDelete != nil && *fk.OnDelete != "" {
		query += " ON DELETE " + *fk.OnDelete
	}

	return query
}

func foreignKeyChanged(oldFK, newFK *dto.MysqlTableForeignKeyData) bool {
	if *oldFK.ConstraintName != *newFK.ConstraintName {
		return true
	}

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
