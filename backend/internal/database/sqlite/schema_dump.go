package databaseSqlite

import (
	"context"
	"strings"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

// DumpSchema reads the DDL SQLite stores verbatim. Foreign keys stay inline in
// CREATE TABLE (SQLite cannot add them later), so the load runs with
// enforcement off and tables are ordered parents-first.
func (r *SQLiteRepository) DumpSchema(ctx context.Context, _, _ *string, tables []string) (*databaseContract.SchemaDump, error) {
	db := r.base.DB().WithContext(ctx)
	dump := &databaseContract.SchemaDump{
		Preamble:  []string{"PRAGMA foreign_keys = OFF;"},
		Postamble: []string{"PRAGMA foreign_keys = ON;"},
	}

	for _, name := range tables {
		var create string

		if err := db.Raw("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?", name).Scan(&create).Error; err != nil {
			return nil, err
		}

		if strings.TrimSpace(create) == "" {
			continue
		}

		var indexes, parents, generated []string

		if err := db.Raw("SELECT name FROM pragma_table_xinfo(?) WHERE hidden IN (2, 3)", name).Scan(&generated).Error; err != nil {
			return nil, err
		}

		if err := db.Raw("SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL", name).Scan(&indexes).Error; err != nil {
			return nil, err
		}

		if err := db.Raw(`SELECT DISTINCT "table" FROM pragma_foreign_key_list(?)`, name).Scan(&parents).Error; err != nil {
			return nil, err
		}

		post := make([]string, 0, len(indexes))
		for _, index := range indexes {
			post = append(post, strings.TrimSpace(index)+";")
		}

		dump.Tables = append(dump.Tables, databaseContract.TableDDL{
			Name:      name,
			Create:    strings.TrimSpace(create) + ";",
			Post:      post,
			DependsOn: parents,

			GeneratedColumns: generated,
		})
	}

	return dump, nil
}
