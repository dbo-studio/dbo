package ddlMysql

import (
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func columnStatements(input TableInput, tableName string) []ddl.Statement {
	tableRef := quote.MysqlQualifiedTable(input.Database, tableName)
	alter := "ALTER TABLE " + tableRef

	var statements []ddl.Statement

	for _, column := range columnRows(input) {
		if column.New == nil {
			continue
		}

		if lo.FromPtr(column.Deleted) {
			name := column.New.Name
			if column.Old != nil && column.Old.Name != nil {
				name = column.Old.Name
			}

			if name != nil {
				statements = append(statements, ddl.Statement{
					SQL:   alter + " DROP COLUMN " + quote.MysqlIdent(*name),
					Phase: ddl.PhaseColumns,
				})
			}

			continue
		}

		if lo.FromPtr(column.Added) {
			if column.New.Name == nil || column.New.DataType == nil {
				continue
			}

			statements = append(statements, ddl.Statement{
				SQL:   alter + " ADD COLUMN " + inlineColumnDefinition(column.New),
				Phase: ddl.PhaseColumns,
			})

			continue
		}

		if query := changeColumnStatement(alter, column); query != "" {
			statements = append(statements, ddl.Statement{SQL: query, Phase: ddl.PhaseColumns})
		}
	}

	return statements
}

func changeColumnStatement(alter string, column dto.MysqlTableColumn) string {
	newData := column.New
	if newData.Name == nil || newData.DataType == nil {
		return ""
	}

	oldData := column.Old
	effective := effectiveColumnData(oldData, newData)

	def := quote.MysqlIdent(oldColumnName(column)) + " " + quote.MysqlIdent(*newData.Name) + " " +
		formatColumnType(*effective.DataType, effective.MaxLength, effective.NumericScale)

	if lo.FromPtr(effective.NotNull) {
		def += " NOT NULL"
	} else {
		def += " NULL"
	}

	if lo.FromPtr(effective.IsIdentity) {
		def += " AUTO_INCREMENT"
	}

	if effective.Default != nil && *effective.Default != "" {
		def += " DEFAULT " + formatDefault(*effective.Default)
	}

	if effective.Comment != nil && *effective.Comment != "" {
		def += " COMMENT " + quote.MysqlLiteral(*effective.Comment)
	}

	if !columnChanged(oldData, newData) {
		return ""
	}

	return alter + " CHANGE COLUMN " + def
}

func effectiveColumnData(oldData, newData *dto.MysqlTableColumnData) *dto.MysqlTableColumnData {
	effective := *newData

	if oldData == nil {
		return &effective
	}

	if effective.DataType == nil && oldData.DataType != nil {
		effective.DataType = oldData.DataType
		effective.MaxLength = oldData.MaxLength
		effective.NumericScale = oldData.NumericScale
	}

	if effective.MaxLength == nil {
		effective.MaxLength = oldData.MaxLength
	}

	if effective.NumericScale == nil {
		effective.NumericScale = oldData.NumericScale
	}

	if effective.NotNull == nil {
		effective.NotNull = oldData.NotNull
	}

	if effective.IsIdentity == nil {
		effective.IsIdentity = oldData.IsIdentity
	}

	if effective.Default == nil {
		effective.Default = oldData.Default
	}

	if effective.Comment == nil {
		effective.Comment = oldData.Comment
	}

	return &effective
}

func oldColumnName(column dto.MysqlTableColumn) string {
	if column.Old != nil && column.Old.Name != nil {
		return *column.Old.Name
	}

	return *column.New.Name
}

func columnChanged(oldData, newData *dto.MysqlTableColumnData) bool {
	if oldData == nil {
		return true
	}

	if oldData.Name != nil && newData.Name != nil && *oldData.Name != *newData.Name {
		return true
	}

	if oldData.DataType != nil && newData.DataType != nil &&
		!strings.EqualFold(*oldData.DataType, *newData.DataType) {
		return true
	}

	if !ddl.PtrStringsEqual(oldData.MaxLength, newData.MaxLength) {
		return true
	}

	if !ddl.PtrStringsEqual(oldData.NumericScale, newData.NumericScale) {
		return true
	}

	if oldData.NotNull != nil && newData.NotNull != nil && *oldData.NotNull != *newData.NotNull {
		return true
	}

	if lo.FromPtr(oldData.IsIdentity) != lo.FromPtr(newData.IsIdentity) {
		return true
	}

	if lo.FromPtr(oldData.Default) != lo.FromPtr(newData.Default) {
		return true
	}

	if lo.FromPtr(oldData.Comment) != lo.FromPtr(newData.Comment) {
		return true
	}

	return false
}
