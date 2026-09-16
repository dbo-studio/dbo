package ddlMysql

import (
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

// buildEditTablePlan assembles the edit flow in deterministic phases:
// 1) table metadata alters, 2) columns (CHANGE), 3) keys, 4) indexes,
// 5) foreign keys.
func buildEditTablePlan(input TableInput) (ddl.Plan, string, error) {
	general := input.General

	tableName := input.NodeTable
	if general != nil && general.Old != nil && general.Old.Name != nil && *general.Old.Name != "" {
		tableName = *general.Old.Name
	}

	if tableName == "" {
		return nil, "", nil
	}

	tableRef := quote.MysqlQualifiedTable(input.Database, tableName)

	plan := ddl.Plan{}
	addTable := func(sql string) {
		plan = append(plan, ddl.Statement{SQL: sql, Phase: ddl.PhaseTable})
	}

	if general != nil && general.New != nil {
		old := general.Old

		if general.New.Name != nil && (old == nil || old.Name == nil || *old.Name != *general.New.Name) {
			addTable("ALTER TABLE " + tableRef + " RENAME TO " + quote.MysqlIdent(*general.New.Name))
			tableName = *general.New.Name
			tableRef = quote.MysqlQualifiedTable(input.Database, tableName)
		}

		if general.New.Comment != nil && *general.New.Comment != "" &&
			(old == nil || old.Comment == nil || *old.Comment != *general.New.Comment) {
			addTable("ALTER TABLE " + tableRef + " COMMENT = " + quote.MysqlLiteral(*general.New.Comment))
		}
	}

	plan = append(plan, columnStatements(input, tableName)...)
	plan = append(plan, keyStatements(input, tableName)...)
	plan = append(plan, indexStatements(input.Database, tableName, indexRows(input), input.Action)...)
	plan = append(plan, foreignKeyStatements(input.Database, tableName, foreignKeyRows(input), input.Action)...)

	return plan, tableName, nil
}

// columnStatements builds the columns phase. Multi-field edits on one row
// are composed into a single CHANGE statement with the full field spec.
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

// changeColumnStatement prefers `CHANGE old new <full_spec>` so type,
// nullability, default and comment edits form one coherent statement.
func changeColumnStatement(alter string, column dto.MysqlTableColumn) string {
	newData := column.New
	if newData.Name == nil || newData.DataType == nil {
		return ""
	}

	oldData := column.Old
	effective := effectiveColumnData(oldData, newData)

	def := quote.MysqlIdent(oldColumnName(column)) + " " + quote.MysqlIdent(*newData.Name) + " " +
		FormatColumnType(*effective.DataType, effective.MaxLength, effective.NumericScale)

	if lo.FromPtr(effective.NotNull) {
		def += " NOT NULL"
	} else {
		def += " NULL"
	}

	if effective.Default != nil && *effective.Default != "" {
		def += " DEFAULT " + FormatDefault(*effective.Default)
	}

	if effective.Comment != nil && *effective.Comment != "" {
		def += " COMMENT " + quote.MysqlLiteral(*effective.Comment)
	}

	if !columnChanged(oldData, newData) {
		return ""
	}

	return alter + " CHANGE COLUMN " + def
}

// effectiveColumnData overlays the submitted values on the previous state so
// the full CHANGE spec never silently resets untouched attributes.
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

	if effective.NotNull == nil {
		effective.NotNull = oldData.NotNull
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

	if oldData.NotNull != nil && newData.NotNull != nil && *oldData.NotNull != *newData.NotNull {
		return true
	}

	oldDefault := lo.FromPtr(oldData.Default)
	newDefault := lo.FromPtr(newData.Default)

	if oldDefault != newDefault {
		return true
	}

	if lo.FromPtr(oldData.Comment) != lo.FromPtr(newData.Comment) {
		return true
	}

	return false
}

// keyStatements builds the keys phase for the edit flow. Key creation on
// create-table happens inline in the composed CREATE TABLE instead.
func keyStatements(input TableInput, tableName string) []ddl.Statement {
	tableRef := quote.MysqlQualifiedTable(input.Database, tableName)
	alter := "ALTER TABLE " + tableRef

	var statements []ddl.Statement

	for _, key := range keyRows(input) {
		if key.New == nil {
			continue
		}

		if lo.FromPtr(key.Added) {
			if query := addKeyStatement(alter, key.New); query != "" {
				statements = append(statements, ddl.Statement{SQL: query, Phase: ddl.PhaseKeys})
			}

			continue
		}

		if lo.FromPtr(key.Deleted) && key.Old != nil {
			if query := dropKeyStatement(alter, key.Old); query != "" {
				statements = append(statements, ddl.Statement{SQL: query, Phase: ddl.PhaseKeys})
			}
		}
	}

	return statements
}

func addKeyStatement(alter string, key *dto.MysqlTableKeyData) string {
	if key == nil || len(key.Columns) == 0 || key.ConstraintType == nil {
		return ""
	}

	cols := quoteJoinColumns(key.Columns)
	constraintType := strings.ToUpper(*key.ConstraintType)

	if constraintType == "PRIMARY KEY" || constraintType == "PRIMARY" {
		return alter + " ADD PRIMARY KEY (" + cols + ")"
	}

	if constraintType == "UNIQUE" {
		constraintName := lo.FromPtr(key.ConstraintName)
		if constraintName == "" {
			constraintName = "uniq_key"
		}

		return alter + " ADD CONSTRAINT " + quote.MysqlIdent(constraintName) + " UNIQUE (" + cols + ")"
	}

	return ""
}

func dropKeyStatement(alter string, key *dto.MysqlTableKeyData) string {
	if key == nil || key.ConstraintType == nil {
		return ""
	}

	constraintType := strings.ToUpper(*key.ConstraintType)
	if constraintType == "PRIMARY KEY" || constraintType == "PRIMARY" {
		return alter + " DROP PRIMARY KEY"
	}

	if key.ConstraintName != nil && *key.ConstraintName != "" {
		return alter + " DROP INDEX " + quote.MysqlIdent(*key.ConstraintName)
	}

	return ""
}
