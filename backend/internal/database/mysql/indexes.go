package databaseMysql

import (
	"context"
)

type TableIndex struct {
	IndexName  string `gorm:"column:INDEX_NAME"`
	ColumnName string `gorm:"column:COLUMN_NAME"`
	NonUnique  int    `gorm:"column:NON_UNIQUE"`
	Collation  string `gorm:"column:COLLATION"`
	SeqInIndex int    `gorm:"column:SEQ_IN_INDEX"`
}

func (r *MySQLRepository) tableIndexes(ctx context.Context, database, table string) ([]TableIndex, error) {
	var results []TableIndex
	err := r.base.DB().WithContext(ctx).Raw(`
		SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE, COLLATION, SEQ_IN_INDEX
		FROM information_schema.STATISTICS
		WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
		ORDER BY INDEX_NAME, SEQ_IN_INDEX
	`, database, table).Scan(&results).Error
	if err != nil {
		return nil, err
	}
	return results, nil
}
