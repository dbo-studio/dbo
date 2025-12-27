package databaseMysql

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

type MySQLNode struct {
	Database string
	Table    string
}

func extractNode(node string) MySQLNode {
	parts := strings.Split(node, ".")

	var database, table string

	switch len(parts) {
	case 1:
		database = parts[0]
	case 2:
		database, table = parts[0], parts[1]
	}

	return MySQLNode{
		Database: database,
		Table:    table,
	}
}

func (r *MySQLRepository) cacheKey(args ...string) string {
	return fmt.Sprintf("c:%d:mysql:%s", r.connection.ID, strings.Join(args, "_"))
}

func (r *MySQLRepository) updateCache(ctx context.Context, cacheKey string, value any) {
	go func() {
		bgCtx := context.Background()
		err := r.cache.Set(bgCtx, cacheKey, value, lo.ToPtr(time.Hour))
		if err != nil {
			r.logger.Error(err)
		}
	}()
}

type Column struct {
	OrdinalPosition        int32   `gorm:"column:ORDINAL_POSITION"`
	ColumnName             string  `gorm:"column:COLUMN_NAME"`
	DataType               string  `gorm:"column:DATA_TYPE"`
	IsNullable             string  `gorm:"column:IS_NULLABLE"`
	ColumnDefault          *string `gorm:"column:COLUMN_DEFAULT"`
	CharacterMaximumLength *int32  `gorm:"column:CHARACTER_MAXIMUM_LENGTH"`
	Comment                *string `gorm:"column:COLUMN_COMMENT"`
	NumericScale           *int32  `gorm:"column:NUMERIC_SCALE"`

	MappedType string      `gorm:"-"`
	Editable   bool        `gorm:"-"`
	IsActive   bool        `gorm:"-"`
	PrimaryKey *PrimaryKey `gorm:"-"`
	ForeignKey *ForeignKey `gorm:"-"`
}

func columnMappedFormat(dataType string) string {
	normalized := strings.ToUpper(strings.TrimSpace(dataType))
	if idx := strings.Index(normalized, "("); idx > -1 {
		normalized = normalized[:idx]
	}

	switch normalized {
	case "VARCHAR", "CHAR", "TEXT", "TINYTEXT", "MEDIUMTEXT", "LONGTEXT", "ENUM", "SET", "JSON":
		return "string"
	case "TINYINT", "SMALLINT", "MEDIUMINT", "INT", "INTEGER", "BIGINT", "BIT":
		return "number"
	case "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC":
		return "number"
	case "DATE", "TIME", "DATETIME", "TIMESTAMP", "YEAR":
		return "datetime"
	case "BOOLEAN", "BOOL":
		return "boolean"
	case "BLOB", "TINYBLOB", "MEDIUMBLOB", "LONGBLOB", "BINARY", "VARBINARY":
		return "blob"
	default:
		return "string"
	}
}

func columnListToResponse(columns []Column) []dto.Column {
	data := make([]dto.Column, 0)
	for _, column := range columns {
		var col dto.Column

		col.Name = column.ColumnName
		col.Type = column.DataType
		col.MappedType = column.MappedType
		col.Editable = column.Editable
		col.IsActive = column.IsActive
		col.Length = column.CharacterMaximumLength
		col.Default = column.ColumnDefault
		col.Comment = column.Comment
		col.NotNull = column.IsNullable == "NO"

		data = append(data, col)
	}

	return data
}

func isCharacterType(dataType string) bool {
	characterTypes := []string{"char", "varchar", "text", "tinytext", "mediumtext", "longtext"}
	normalized := strings.ToLower(dataType)
	for _, t := range characterTypes {
		if normalized == t || strings.HasPrefix(normalized, t+"(") {
			return true
		}
	}
	return false
}

func isNumericType(dataType string) bool {
	numericTypes := []string{"int", "integer", "tinyint", "smallint", "mediumint", "bigint", "float", "double", "decimal", "numeric"}
	normalized := strings.ToLower(dataType)
	for _, t := range numericTypes {
		if normalized == t || strings.HasPrefix(normalized, t+"(") {
			return true
		}
	}
	return false
}
