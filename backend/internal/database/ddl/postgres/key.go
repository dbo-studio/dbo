package ddlPostgres

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func inlineKeyConstraints(keys []dto.PostgresTableKey) ([]string, bool) {
	var constraints []string

	hasPrimaryKey := false

	for _, key := range keys {
		if key.New == nil || len(key.New.Columns) == 0 || key.New.Name == nil || *key.New.Name == "" {
			continue
		}

		cols := ddl.JoinQuoted(key.New.Columns, quote.PostgresIdent)
		name := quote.PostgresIdent(*key.New.Name)

		var constraint string

		switch {
		case lo.FromPtr(key.New.Primary):
			constraint = "CONSTRAINT " + name + " PRIMARY KEY (" + cols + ")"
			hasPrimaryKey = true
		case key.New.ExcludeOperator != nil && ddl.PostgresIndexMethod(*key.New.ExcludeOperator) != "":
			constraint = "CONSTRAINT " + name + " EXCLUDE USING " + ddl.PostgresIndexMethod(*key.New.ExcludeOperator) + " (" + cols + ")"
		default:
			constraint = "CONSTRAINT " + name + " UNIQUE (" + cols + ")"
		}

		constraint = appendKeyDeferrableClauses(constraint, key.New)
		constraints = append(constraints, constraint)
	}

	return constraints, hasPrimaryKey
}

func keyStatements(input TableInput, tableName string) []ddl.Statement {
	tableRef := quote.PostgresQualifiedTable(input.Schema, tableName)
	alter := "ALTER TABLE " + tableRef

	var statements []ddl.Statement

	for _, key := range keyRows(input) {
		if key.New == nil {
			continue
		}

		if lo.FromPtr(key.Added) {
			query := addKeyStatement(alter, key.New)
			if query != "" {
				statements = append(statements, ddl.Statement{SQL: query, Phase: ddl.PhaseKeys})
			}

			if key.New.Comment != nil && *key.New.Comment != "" && key.New.Name != nil {
				statements = append(statements,
					commentOnConstraintStatement(*key.New.Name, input.Schema, tableName, *key.New.Comment))
			}

			continue
		}

		if lo.FromPtr(key.Deleted) {
			constraintName := constraintNameFromKey(key)
			if constraintName != "" {
				statements = append(statements, ddl.Statement{
					SQL:   alter + " DROP CONSTRAINT " + quote.PostgresIdent(constraintName),
					Phase: ddl.PhaseKeys,
				})
			}

			continue
		}

		if key.Old != nil && keyDefinitionChanged(key.Old, key.New) {
			oldName := constraintNameFromKey(key)
			if oldName != "" {
				statements = append(statements, ddl.Statement{
					SQL:   alter + " DROP CONSTRAINT " + quote.PostgresIdent(oldName),
					Phase: ddl.PhaseKeys,
				})
			}

			if query := addKeyStatement(alter, key.New); query != "" {
				statements = append(statements, ddl.Statement{SQL: query, Phase: ddl.PhaseKeys})
			}

			if key.New.Comment != nil && *key.New.Comment != "" && key.New.Name != nil {
				statements = append(statements,
					commentOnConstraintStatement(*key.New.Name, input.Schema, tableName, *key.New.Comment))
			}

			continue
		}

		if key.New.Comment != nil && *key.New.Comment != "" {
			constraintName := constraintNameFromKey(key)
			if constraintName != "" {
				statements = append(statements,
					commentOnConstraintStatement(constraintName, input.Schema, tableName, *key.New.Comment))
			}
		}
	}

	return statements
}

func keyDefinitionChanged(oldKey, newKey *dto.PostgresTableKeyData) bool {
	if oldKey == nil || newKey == nil {
		return true
	}

	if lo.FromPtr(oldKey.Name) != lo.FromPtr(newKey.Name) {
		return true
	}

	if lo.FromPtr(oldKey.Primary) != lo.FromPtr(newKey.Primary) {
		return true
	}

	if lo.FromPtr(oldKey.Deferrable) != lo.FromPtr(newKey.Deferrable) {
		return true
	}

	if lo.FromPtr(oldKey.InitiallyDeferred) != lo.FromPtr(newKey.InitiallyDeferred) {
		return true
	}

	if ddl.PostgresIndexMethod(lo.FromPtr(oldKey.ExcludeOperator)) != ddl.PostgresIndexMethod(lo.FromPtr(newKey.ExcludeOperator)) {
		return true
	}

	return !ddl.StringSlicesEqual(oldKey.Columns, newKey.Columns)
}

func constraintNameFromKey(key dto.PostgresTableKey) string {
	if key.Old != nil && key.Old.Name != nil {
		return *key.Old.Name
	}

	if key.New != nil && key.New.Name != nil {
		return *key.New.Name
	}

	return ""
}

func addKeyStatement(alter string, key *dto.PostgresTableKeyData) string {
	if key == nil || len(key.Columns) == 0 || key.Name == nil || *key.Name == "" {
		return ""
	}

	cols := ddl.JoinQuoted(key.Columns, quote.PostgresIdent)
	name := quote.PostgresIdent(*key.Name)

	var query string

	switch {
	case lo.FromPtr(key.Primary):
		query = alter + " ADD CONSTRAINT " + name + " PRIMARY KEY (" + cols + ")"
	case key.ExcludeOperator != nil && ddl.PostgresIndexMethod(*key.ExcludeOperator) != "":
		query = alter + " ADD CONSTRAINT " + name + " EXCLUDE USING " + ddl.PostgresIndexMethod(*key.ExcludeOperator) + " (" + cols + ")"
	default:
		query = alter + " ADD CONSTRAINT " + name + " UNIQUE (" + cols + ")"
	}

	return appendKeyDeferrableClauses(query, key)
}

func appendKeyDeferrableClauses(query string, key *dto.PostgresTableKeyData) string {
	if lo.FromPtr(key.Deferrable) {
		query += " DEFERRABLE"
	}

	if lo.FromPtr(key.InitiallyDeferred) {
		query += " INITIALLY DEFERRED"
	}

	return query
}
