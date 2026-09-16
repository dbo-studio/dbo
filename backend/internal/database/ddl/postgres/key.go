package ddlPostgres

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

// keyStatements builds the keys phase for the edit flow. Key creation on
// create-table happens inline in the composed CREATE TABLE instead.
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

	cols := quoteJoinColumns(key.Columns)
	name := quote.PostgresIdent(*key.Name)

	var query string

	switch {
	case lo.FromPtr(key.Primary):
		query = alter + " ADD CONSTRAINT " + name + " PRIMARY KEY (" + cols + ")"
	case key.ExcludeOperator != nil && *key.ExcludeOperator != "":
		query = alter + " ADD CONSTRAINT " + name + " EXCLUDE USING " + *key.ExcludeOperator + " (" + cols + ")"
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
