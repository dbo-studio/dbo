package ddlSqlite

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func keyRows(input TableInput) []dto.SQLiteTableKey {
	if input.KeyParams == nil {
		return nil
	}

	return input.KeyParams.Keys
}

func filterActiveKeys(keys []dto.SQLiteTableKey) []dto.SQLiteTableKey {
	return lo.Filter(keys, func(key dto.SQLiteTableKey, _ int) bool {
		if key.Added != nil && key.Deleted != nil && *key.Added && *key.Deleted {
			return false
		}

		if lo.FromPtr(key.Deleted) && !lo.FromPtr(key.Added) {
			return false
		}

		if key.Added == nil || *key.Added {
			return true
		}

		return key.New != nil
	})
}

func keyDefinitions(keys []dto.SQLiteTableKey) string {
	filtered := filterActiveKeys(keys)
	if len(filtered) == 0 {
		return ""
	}

	defs := make([]string, 0, len(filtered))
	for _, key := range filtered {
		if def := singleKeyDefinition(key); def != "" {
			defs = append(defs, def)
		}
	}

	return strings.Join(defs, ", ")
}

func singleKeyDefinition(key dto.SQLiteTableKey) string {
	if key.New == nil {
		return ""
	}

	keyType := sqliteKeyType(key.New.Type)
	if keyType == "" {
		return ""
	}

	var parts []string

	if key.New.Name != nil && *key.New.Name != "" {
		parts = append(parts, fmt.Sprintf("CONSTRAINT %s", quote.SqliteIdent(*key.New.Name)))
	}

	parts = append(parts, keyType)

	if len(key.New.Columns) > 0 {
		parts = append(parts, fmt.Sprintf("(%s)", ddl.JoinQuoted(key.New.Columns, quote.SqliteIdent)))
	}

	return strings.Join(parts, " ")
}

func sqliteKeyType(keyType *string) string {
	if keyType == nil {
		return ""
	}

	switch *keyType {
	case "PRIMARY", "PRIMARY KEY":
		return "PRIMARY KEY"
	case "UNIQUE":
		return "UNIQUE"
	default:
		return ""
	}
}
