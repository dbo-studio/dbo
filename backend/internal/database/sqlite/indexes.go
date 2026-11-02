package databaseSqlite

import (
	"context"

	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
)

// tableIndex is a user-created index the Indexes tab can edit: plain column
// lists only. Partial and expression indexes are not representable.
type tableIndex struct {
	Name    string
	Unique  bool
	Columns []string
	Order   string
}

// editableIndexes lists user-created (origin 'c') indexes of a table. Indexes
// backing PRIMARY KEY or UNIQUE constraints belong to the Keys tab.
func (r *SQLiteRepository) editableIndexes(ctx context.Context, table string) ([]tableIndex, error) {
	type indexRow struct {
		Name    string `gorm:"column:name"`
		Unique  int    `gorm:"column:unique"`
		Origin  string `gorm:"column:origin"`
		Partial int    `gorm:"column:partial"`
	}

	var rows []indexRow

	if err := r.base.DB().WithContext(ctx).Raw("PRAGMA index_list(" + quote.SqliteIdent(table) + ")").Scan(&rows).Error; err != nil {
		return nil, err
	}

	indexes := make([]tableIndex, 0, len(rows))

	for _, row := range rows {
		if row.Origin != "c" || row.Partial == 1 {
			continue
		}

		type columnRow struct {
			Name *string `gorm:"column:name"`
			Desc int     `gorm:"column:desc"`
			Key  int     `gorm:"column:key"`
		}

		var columnRows []columnRow

		if err := r.base.DB().WithContext(ctx).Raw("PRAGMA index_xinfo(" + quote.SqliteIdent(row.Name) + ")").Scan(&columnRows).Error; err != nil {
			return nil, err
		}

		index := tableIndex{Name: row.Name, Unique: row.Unique == 1, Order: "ASC"}
		plain := true

		for _, column := range columnRows {
			if column.Key != 1 {
				continue
			}

			if column.Name == nil {
				plain = false
				break
			}

			if len(index.Columns) == 0 && column.Desc == 1 {
				index.Order = "DESC"
			}

			index.Columns = append(index.Columns, *column.Name)
		}

		if plain && len(index.Columns) > 0 {
			indexes = append(indexes, index)
		}
	}

	return indexes, nil
}
