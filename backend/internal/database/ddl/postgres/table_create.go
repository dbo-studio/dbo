package ddlPostgres

import (
	"errors"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func buildCreateTablePlan(input TableInput) (ddl.Plan, string, error) {
	general := input.General
	if general == nil || general.New == nil || general.New.Name == nil || *general.New.Name == "" {
		return nil, "", errors.New("missing table name")
	}

	tableName := *general.New.Name
	tableRef := quote.PostgresQualifiedTable(input.Schema, tableName)

	createColumns := lo.Filter(columnRows(input), func(col dto.PostgresTableColumn, _ int) bool {
		return col.New != nil && col.New.Name != nil && col.New.DataType != nil
	})

	var tableConstraints []string

	keyConstraints, hasPrimaryKey := inlineKeyConstraints(keyRows(input))
	tableConstraints = append(tableConstraints, keyConstraints...)

	if !hasPrimaryKey {
		pkColumns := lo.FilterMap(createColumns, func(col dto.PostgresTableColumn, _ int) (string, bool) {
			return quote.PostgresIdent(*col.New.Name), lo.FromPtr(col.New.Primary)
		})

		if len(pkColumns) > 0 {
			tableConstraints = append(tableConstraints, "PRIMARY KEY ("+strings.Join(pkColumns, ", ")+")")
		}
	}

	columnDefs := lo.Map(createColumns, func(col dto.PostgresTableColumn, _ int) string {
		return columnDefinition(col.New)
	})

	allDefs := append(columnDefs, tableConstraints...)

	createQuery := "CREATE TABLE " + tableRef + " (" + strings.Join(allDefs, ", ") + ")"
	if general.New.Tablespace != nil && *general.New.Tablespace != "" {
		createQuery += " TABLESPACE " + quote.PostgresIdent(*general.New.Tablespace)
	}

	plan := ddl.Plan{{SQL: createQuery, Phase: ddl.PhaseTable}}

	if general.New.Persistence != nil && *general.New.Persistence != "" {
		plan = append(plan, ddl.Statement{
			SQL:   "ALTER TABLE " + tableRef + " SET " + *general.New.Persistence,
			Phase: ddl.PhaseTable,
		})
	}

	if general.New.Owner != nil && *general.New.Owner != "" {
		plan = append(plan, ddl.Statement{
			SQL:   "ALTER TABLE " + tableRef + " OWNER TO " + quote.PostgresIdent(*general.New.Owner),
			Phase: ddl.PhaseTable,
		})
	}

	if general.New.Comment != nil {
		plan = append(plan, commentOnTableStatement(input.Schema, tableName, *general.New.Comment))
	}

	for _, col := range createColumns {
		if col.New.Comment != nil && *col.New.Comment != "" {
			plan = append(plan, commentOnColumnStatement(input.Schema, tableName, *col.New.Name, *col.New.Comment))
		}
	}

	for _, key := range keyRows(input) {
		if key.New == nil || key.New.Comment == nil || *key.New.Comment == "" || key.New.Name == nil {
			continue
		}

		plan = append(plan, commentOnConstraintStatement(*key.New.Name, input.Schema, tableName, *key.New.Comment))
	}

	plan = append(plan, foreignKeyStatements(input.Schema, tableName, foreignKeyRows(input), contract.CreateTableAction)...)

	return plan, tableName, nil
}

// inlineKeyConstraints composes named PRIMARY KEY / UNIQUE / EXCLUDE
// constraints from the keys tab for the inline part of CREATE TABLE.
func inlineKeyConstraints(keys []dto.PostgresTableKey) ([]string, bool) {
	var constraints []string

	hasPrimaryKey := false

	for _, key := range keys {
		if key.New == nil || len(key.New.Columns) == 0 || key.New.Name == nil || *key.New.Name == "" {
			continue
		}

		cols := quoteJoinColumns(key.New.Columns)
		name := quote.PostgresIdent(*key.New.Name)

		var constraint string

		switch {
		case lo.FromPtr(key.New.Primary):
			constraint = "CONSTRAINT " + name + " PRIMARY KEY (" + cols + ")"
			hasPrimaryKey = true
		case key.New.ExcludeOperator != nil && *key.New.ExcludeOperator != "":
			constraint = "CONSTRAINT " + name + " EXCLUDE USING " + *key.New.ExcludeOperator + " (" + cols + ")"
		default:
			constraint = "CONSTRAINT " + name + " UNIQUE (" + cols + ")"
		}

		constraint = appendKeyDeferrableClauses(constraint, key.New)
		constraints = append(constraints, constraint)
	}

	return constraints, hasPrimaryKey
}

func quoteJoinColumns(columns []string) string {
	quoted := make([]string, len(columns))
	for i, col := range columns {
		quoted[i] = quote.PostgresIdent(col)
	}

	return strings.Join(quoted, ", ")
}
