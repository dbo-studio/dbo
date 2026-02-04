package serviceConfig

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/internal/container"
)

func (i IConfigServiceImpl) ResetFactory(ctx context.Context) error {
	type Table struct {
		Name string `gorm:"column:tbl_name"`
	}

	db := container.Instance().DB()

	tables := make([]Table, 0)
	err := db.Table("sqlite_master").
		Select("tbl_name").
		Where("type = 'table'").
		Scan(&tables).Error

	if err != nil {
		return err
	}

	for _, table := range tables {
		if err := db.Exec(fmt.Sprintf("DELETE FROM %s", table.Name)).Error; err != nil {
			return err
		}
	}

	return nil
}
