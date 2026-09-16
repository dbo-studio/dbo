package ddlMysql

import (
	"errors"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

// buildCreateTablePlan composes a single CREATE TABLE with all columns and
// PK/UNIQUE constraints inline; indexes and foreign keys follow as
// separate statements (deterministic, InnoDB-safe ordering).
func buildCreateTablePlan(input TableInput) (ddl.Plan, string, error) {
	general := input.General
	if general == nil || general.New == nil || general.New.Name == nil || *general.New.Name == "" {
		return nil, "", errors.New("missing table name")
	}

	tableName := *general.New.Name
	tableRef := quote.MysqlQualifiedTable(input.Database, tableName)

	createColumns := lo.Filter(columnRows(input), func(col dto.MysqlTableColumn, _ int) bool {
		return col.New != nil && col.New.Name != nil && col.New.DataType != nil
	})

	columnDefs := lo.Map(createColumns, func(col dto.MysqlTableColumn, _ int) string {
		return inlineColumnDefinition(col.New)
	})

	var tableConstraints []string

	keyConstraints, hasPrimaryKey := inlineKeyConstraints(keyRows(input))
	tableConstraints = append(tableConstraints, keyConstraints...)

	if !hasPrimaryKey {
		pkColumns := lo.FilterMap(createColumns, func(col dto.MysqlTableColumn, _ int) (string, bool) {
			return quote.MysqlIdent(*col.New.Name), lo.FromPtr(col.New.Primary)
		})

		if len(pkColumns) > 0 {
			tableConstraints = append(tableConstraints, "PRIMARY KEY ("+strings.Join(pkColumns, ", ")+")")
		}
	}

	allDefs := append(columnDefs, tableConstraints...)

	createQuery := "CREATE TABLE " + tableRef + " (" + strings.Join(allDefs, ", ") + ")"
	if general.New.Comment != nil && *general.New.Comment != "" {
		createQuery += " COMMENT=" + quote.MysqlLiteral(*general.New.Comment)
	}

	plan := ddl.Plan{{SQL: createQuery, Phase: ddl.PhaseTable}}
	plan = append(plan, indexStatements(input.Database, tableName, indexRows(input), contract.CreateTableAction)...)
	plan = append(plan, foreignKeyStatements(input.Database, tableName, foreignKeyRows(input), contract.CreateTableAction)...)

	return plan, tableName, nil
}

// inlineColumnDefinition is the shared field_spec used by CREATE and
// ALTER column statements.
func inlineColumnDefinition(column *dto.MysqlTableColumnData) string {
	def := quote.MysqlIdent(*column.Name) + " " + FormatColumnType(*column.DataType, column.MaxLength, column.NumericScale)

	if lo.FromPtr(column.NotNull) {
		def += " NOT NULL"
	}

	if column.Default != nil && *column.Default != "" {
		def += " DEFAULT " + FormatDefault(*column.Default)
	}

	if column.Comment != nil && *column.Comment != "" {
		def += " COMMENT " + quote.MysqlLiteral(*column.Comment)
	}

	return def
}

func inlineKeyConstraints(keys []dto.MysqlTableKey) ([]string, bool) {
	var constraints []string

	hasPrimaryKey := false

	for _, key := range keys {
		if key.New == nil || len(key.New.Columns) == 0 || key.New.ConstraintType == nil {
			continue
		}

		constraintType := strings.ToUpper(*key.New.ConstraintType)
		cols := quoteJoinColumns(key.New.Columns)

		switch constraintType {
		case "PRIMARY KEY", "PRIMARY":
			constraints = append(constraints, "PRIMARY KEY ("+cols+")")
			hasPrimaryKey = true
		case "UNIQUE":
			constraintName := lo.FromPtr(key.New.ConstraintName)
			if constraintName == "" {
				constraintName = "uniq_key"
			}

			constraints = append(constraints,
				"CONSTRAINT "+quote.MysqlIdent(constraintName)+" UNIQUE ("+cols+")")
		}
	}

	return constraints, hasPrimaryKey
}
