package ddlMysql

import (
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func inlineKeyConstraints(keys []dto.MysqlTableKey) ([]string, bool) {
	var constraints []string

	hasPrimaryKey := false

	for _, key := range keys {
		if key.New == nil || len(key.New.Columns) == 0 || key.New.ConstraintType == nil {
			continue
		}

		constraintType := strings.ToUpper(*key.New.ConstraintType)
		cols := ddl.JoinQuoted(key.New.Columns, quote.MysqlIdent)

		switch constraintType {
		case "PRIMARY KEY", "PRIMARY":
			constraints = append(constraints, "PRIMARY KEY ("+cols+")")
			hasPrimaryKey = true
		case "UNIQUE":
			constraintName := lo.FromPtr(key.New.ConstraintName)
			if constraintName == "" {
				constraintName = uniqueConstraintName(key.New.Columns)
			}

			constraints = append(constraints,
				"CONSTRAINT "+quote.MysqlIdent(constraintName)+" UNIQUE ("+cols+")")
		}
	}

	return constraints, hasPrimaryKey
}

func keyStatements(input TableInput, tableName string) []ddl.Statement {
	tableRef := quote.MysqlQualifiedTable(input.Database, tableName)
	alter := "ALTER TABLE " + tableRef

	var statements []ddl.Statement

	for _, key := range keyRows(input) {
		if key.New == nil {
			continue
		}

		if lo.FromPtr(key.Added) {
			if query := addKeyStatement(alter, key.New); query != "" {
				statements = append(statements, ddl.Statement{SQL: query, Phase: ddl.PhaseKeys})
			}

			continue
		}

		if lo.FromPtr(key.Deleted) && key.Old != nil {
			if query := dropKeyStatement(alter, key.Old); query != "" {
				statements = append(statements, ddl.Statement{SQL: query, Phase: ddl.PhaseKeys})
			}

			continue
		}

		if key.Old != nil && keyDefinitionChanged(key.Old, key.New) {
			if query := dropKeyStatement(alter, key.Old); query != "" {
				statements = append(statements, ddl.Statement{SQL: query, Phase: ddl.PhaseKeys})
			}

			if query := addKeyStatement(alter, key.New); query != "" {
				statements = append(statements, ddl.Statement{SQL: query, Phase: ddl.PhaseKeys})
			}
		}
	}

	return statements
}

func keyDefinitionChanged(oldKey, newKey *dto.MysqlTableKeyData) bool {
	if oldKey == nil || newKey == nil {
		return true
	}

	if lo.FromPtr(oldKey.ConstraintName) != lo.FromPtr(newKey.ConstraintName) {
		return true
	}

	if lo.FromPtr(oldKey.ConstraintType) != lo.FromPtr(newKey.ConstraintType) {
		return true
	}

	return !ddl.StringSlicesEqual(oldKey.Columns, newKey.Columns)
}

func addKeyStatement(alter string, key *dto.MysqlTableKeyData) string {
	if key == nil || len(key.Columns) == 0 || key.ConstraintType == nil {
		return ""
	}

	cols := ddl.JoinQuoted(key.Columns, quote.MysqlIdent)
	constraintType := strings.ToUpper(*key.ConstraintType)

	if constraintType == "PRIMARY KEY" || constraintType == "PRIMARY" {
		return alter + " ADD PRIMARY KEY (" + cols + ")"
	}

	if constraintType == "UNIQUE" {
		constraintName := lo.FromPtr(key.ConstraintName)
		if constraintName == "" {
			constraintName = uniqueConstraintName(key.Columns)
		}

		return alter + " ADD CONSTRAINT " + quote.MysqlIdent(constraintName) + " UNIQUE (" + cols + ")"
	}

	return ""
}

func dropKeyStatement(alter string, key *dto.MysqlTableKeyData) string {
	if key == nil || key.ConstraintType == nil {
		return ""
	}

	constraintType := strings.ToUpper(*key.ConstraintType)
	if constraintType == "PRIMARY KEY" || constraintType == "PRIMARY" {
		return alter + " DROP PRIMARY KEY"
	}

	if key.ConstraintName != nil && *key.ConstraintName != "" {
		return alter + " DROP INDEX " + quote.MysqlIdent(*key.ConstraintName)
	}

	return ""
}
