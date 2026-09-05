package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

type IConfigRepoImpl struct {
	db *gorm.DB
}

func NewConfigRepo(db *gorm.DB) IConfigRepo {
	return &IConfigRepoImpl{
		db: db,
	}
}

func (r *IConfigRepoImpl) TruncateAllTables(ctx context.Context) error {
	type Table struct {
		Name string `gorm:"column:tbl_name"`
	}

	var tables []Table
	if err := r.db.WithContext(ctx).Table("sqlite_master").
		Select("tbl_name").
		Where("type = 'table'").
		Scan(&tables).Error; err != nil {
		return err
	}

	for _, table := range tables {
		if err := r.db.WithContext(ctx).Exec(fmt.Sprintf("DELETE FROM %s", table.Name)).Error; err != nil {
			return err
		}
	}

	return nil
}
