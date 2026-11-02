package databaseMysql

import (
	"context"
	"fmt"
	"strings"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/samber/lo"
)

// DumpSchema uses SHOW CREATE TABLE, which keeps foreign keys inline, so the
// load disables FOREIGN_KEY_CHECKS like mysqldump does.
func (r *MySQLRepository) DumpSchema(ctx context.Context, database, _ *string, tables []string) (*databaseContract.SchemaDump, error) {
	name := strings.TrimSpace(lo.FromPtr(database))
	if name == "" {
		name = databaseConnection.DefaultMysqlDatabase(r.base.Connection())
	}

	db, cleanup, err := r.sessionForDatabase(ctx, name)
	if err != nil {
		return nil, err
	}
	defer cleanup()

	type parentRow struct {
		TableName string `gorm:"column:table_name"`
		Parent    string `gorm:"column:parent"`
	}

	var parents []parentRow

	err = db.WithContext(ctx).Raw(`
		SELECT DISTINCT TABLE_NAME AS table_name, REFERENCED_TABLE_NAME AS parent
		FROM information_schema.KEY_COLUMN_USAGE
		WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
	`).Scan(&parents).Error
	if err != nil {
		return nil, err
	}

	dependsOn := make(map[string][]string)
	for _, p := range parents {
		dependsOn[p.TableName] = append(dependsOn[p.TableName], p.Parent)
	}

	type generatedRow struct {
		TableName  string `gorm:"column:table_name"`
		ColumnName string `gorm:"column:column_name"`
	}

	var generated []generatedRow

	err = db.WithContext(ctx).Raw(`
		SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name
		FROM information_schema.COLUMNS
		WHERE TABLE_SCHEMA = DATABASE() AND GENERATION_EXPRESSION <> ''
	`).Scan(&generated).Error
	if err != nil {
		return nil, err
	}

	generatedBy := make(map[string][]string)
	for _, g := range generated {
		generatedBy[g.TableName] = append(generatedBy[g.TableName], g.ColumnName)
	}

	dump := &databaseContract.SchemaDump{
		Preamble:  []string{"SET FOREIGN_KEY_CHECKS = 0;"},
		Postamble: []string{"SET FOREIGN_KEY_CHECKS = 1;"},
	}

	for _, table := range tables {
		row := map[string]any{}

		if err := db.WithContext(ctx).Raw("SHOW CREATE TABLE " + databaseCore.QuoteMySQLIdent(table)).Scan(&row).Error; err != nil {
			return nil, err
		}

		create, _ := row["Create Table"].(string)
		if create == "" {
			if b, ok := row["Create Table"].([]byte); ok {
				create = string(b)
			}
		}

		if create == "" {
			return nil, fmt.Errorf("no DDL returned for table %s", table)
		}

		dump.Tables = append(dump.Tables, databaseContract.TableDDL{
			Name:      table,
			Create:    create + ";",
			DependsOn: dependsOn[table],

			GeneratedColumns: generatedBy[table],
		})
	}

	return dump, nil
}
