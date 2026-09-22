package ddlSqlite

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func foreignKeyRows(input TableInput) []dto.SQLiteTableForeignKey {
	if input.ForeignKeyParams == nil {
		return nil
	}

	return input.ForeignKeyParams.Columns
}

func filterActiveForeignKeys(foreignKeys []dto.SQLiteTableForeignKey) []dto.SQLiteTableForeignKey {
	return lo.Filter(foreignKeys, func(fk dto.SQLiteTableForeignKey, _ int) bool {
		if fk.Added != nil && fk.Deleted != nil && *fk.Added && *fk.Deleted {
			return false
		}

		if lo.FromPtr(fk.Deleted) && !lo.FromPtr(fk.Added) {
			return false
		}

		if fk.Added == nil || *fk.Added {
			return true
		}

		return fk.New != nil
	})
}

func foreignKeyDefinitions(foreignKeys []dto.SQLiteTableForeignKey) string {
	filtered := filterActiveForeignKeys(foreignKeys)
	if len(filtered) == 0 {
		return ""
	}

	defs := make([]string, 0, len(filtered))
	for _, fk := range filtered {
		if def := singleForeignKeyDefinition(fk); def != "" {
			defs = append(defs, def)
		}
	}

	return strings.Join(defs, ", ")
}

func singleForeignKeyDefinition(fk dto.SQLiteTableForeignKey) string {
	if fk.New == nil {
		return ""
	}

	var parts []string

	if fk.New.ConstraintName != nil && *fk.New.ConstraintName != "" {
		parts = append(parts, fmt.Sprintf("CONSTRAINT %s", quote.SqliteIdent(*fk.New.ConstraintName)))
	}

	parts = append(parts, "FOREIGN KEY")
	parts = append(parts, fmt.Sprintf("(%s)", ddl.JoinQuoted(fk.New.SourceColumns, quote.SqliteIdent)))
	parts = append(parts, "REFERENCES")
	parts = append(parts, quote.SqliteIdent(lo.FromPtr(fk.New.TargetTable)))

	if len(fk.New.TargetColumns) > 0 {
		parts = append(parts, fmt.Sprintf("(%s)", ddl.JoinQuoted(fk.New.TargetColumns, quote.SqliteIdent)))
	}

	if action := ddl.ReferentialAction(lo.FromPtr(fk.New.OnUpdate)); action != "" {
		parts = append(parts, "ON UPDATE "+action)
	}

	if action := ddl.ReferentialAction(lo.FromPtr(fk.New.OnDelete)); action != "" {
		parts = append(parts, "ON DELETE "+action)
	}

	if fk.New.IsDeferrable != nil && *fk.New.IsDeferrable {
		parts = append(parts, "DEFERRABLE")
		if fk.New.InitiallyDeferred != nil && *fk.New.InitiallyDeferred {
			parts = append(parts, "INITIALLY DEFERRED")
		}
	}

	return strings.Join(parts, " ")
}
