package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

func (r *PostgresRepository) Objects(nodeID, objType string) (any, error) {
	switch objType {
	case "table":
		var columns []struct {
			Name       string `gorm:"column:column_name"`
			DataType   string `gorm:"column:data_type"`
			IsNullable string `gorm:"column:is_nullable"`
			DefaultVal string `gorm:"column:column_default"`
		}
		err := r.db.Raw("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = ?", nodeID).Scan(&columns).Error
		if err != nil {
			return nil, err
		}
		tableColumns := make([]dto.ColumnDefinition, len(columns))
		for i, col := range columns {
			tableColumns[i] = dto.ColumnDefinition{
				Name:     col.Name,
				DataType: col.DataType,
				NotNull:  col.IsNullable == "NO",
				Default:  col.DefaultVal,
			}
		}
		return dto.PostgresCreateTableParams{Name: nodeID, Columns: tableColumns}, nil

	case "view":
		var query string
		err := r.db.Raw("SELECT definition FROM pg_views WHERE viewname = ?", nodeID).Scan(&query).Error
		if err != nil {
			return nil, err
		}
		return dto.PostgresCreateObjectParams{Name: nodeID, Type: "view", Query: query, OrReplace: false}, nil

	case "materializedView":
		var query string
		err := r.db.Raw("SELECT definition FROM pg_matviews WHERE matviewname = ?", nodeID).Scan(&query).Error
		if err != nil {
			return nil, err
		}
		var withData bool
		err = r.db.Raw("SELECT populated FROM pg_matviews WHERE matviewname = ?", nodeID).Scan(&withData).Error
		if err != nil {
			return nil, err
		}
		return dto.PostgresCreateObjectParams{Name: nodeID, Type: "materializedView", Query: query, OrReplace: false, WithData: withData}, nil

	case "index":
		var tableName string
		var columns []string
		err := r.db.Raw(`
            SELECT t.relname AS table_name, STRING_AGG(a.attname, ', ') AS columns
            FROM pg_class c
            JOIN pg_index i ON i.indexrelid = c.oid
            JOIN pg_class t ON i.indrelid = t.oid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
            WHERE c.relname = ?
            GROUP BY t.relname`, nodeID).Scan(&struct {
			TableName *string `gorm:"column:table_name"`
			Columns   string  `gorm:"column:columns"`
		}{TableName: &tableName, Columns: strings.Join(columns, ", ")}).Error
		if err != nil {
			return nil, err
		}
		return dto.PostgresCreateObjectParams{Name: nodeID, Type: "index", TableName: tableName, Columns: columns}, nil

	case "sequence":
		var minValue, maxValue, startValue, increment int64
		err := r.db.Raw("SELECT min_value, max_value, start_value, increment_by FROM pg_sequences WHERE sequencename = ?", nodeID).Scan(&struct {
			MinValue   int64 `gorm:"column:min_value"`
			MaxValue   int64 `gorm:"column:max_value"`
			StartValue int64 `gorm:"column:start_value"`
			Increment  int64 `gorm:"column:increment_by"`
		}{MinValue: minValue, MaxValue: maxValue, StartValue: startValue, Increment: increment}).Error
		if err != nil {
			return nil, err
		}
		return dto.PostgresCreateObjectParams{Name: nodeID, Type: "sequence"}, nil // اطلاعات بیشتر می‌تونی به Struct اضافه کنی

	default:
		return nil, fmt.Errorf("PostgreSQL: unsupported object type: %s", objType)
	}
}
