package databaseMssql

import (
	"context"
	"strings"

	generic "github.com/dbo-studio/dbo/internal/database/generic"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

func (mssql) Sequences(_ context.Context, db *gorm.DB, ns string) ([]string, error) {
	var names []string

	err := db.Raw(`SELECT name FROM sys.sequences WHERE schema_id = SCHEMA_ID(?) ORDER BY name`, ns).Scan(&names).Error

	return names, err
}

func (mssql) SequenceRow(_ context.Context, db *gorm.DB, ns, name string) (map[string]any, error) {
	var row struct {
		Start, Increment, MinValue, MaxValue string
		Cycle                                bool
	}

	err := db.Raw(`SELECT CAST(start_value AS NVARCHAR(40)) AS start, CAST(increment AS NVARCHAR(40)) AS increment,
CAST(minimum_value AS NVARCHAR(40)) AS min_value, CAST(maximum_value AS NVARCHAR(40)) AS max_value, is_cycling AS cycle
FROM sys.sequences WHERE schema_id = SCHEMA_ID(?) AND name = ?`, ns, name).Scan(&row).Error

	return map[string]any{
		"name": name, "start_value": row.Start, "increment_by": row.Increment,
		"min_value": row.MinValue, "max_value": row.MaxValue, "cycle": row.Cycle,
	}, err
}

func (m mssql) sequenceClauses(s generic.SequenceSpec) string {
	var out []string

	if s.Increment != "" {
		out = append(out, "INCREMENT BY "+s.Increment)
	}

	if s.Min != "" {
		out = append(out, "MINVALUE "+s.Min)
	}

	if s.Max != "" {
		out = append(out, "MAXVALUE "+s.Max)
	}

	out = append(out, lo.Ternary(s.Cycle, "CYCLE", "NO CYCLE"))

	return strings.Join(out, " ")
}

func (m mssql) CreateSequence(ns string, s generic.SequenceSpec) string {
	sql := "CREATE SEQUENCE " + m.table(ns, s.Name)
	if s.Start != "" {
		sql += " START WITH " + s.Start
	}

	return sql + " " + m.sequenceClauses(s)
}

func (m mssql) AlterSequence(ns string, old, next generic.SequenceSpec) []string {
	var statements []string

	if old.Name != next.Name {
		statements = append(statements, "EXEC sp_rename "+tsqlLiteral(ns+"."+old.Name)+", "+tsqlLiteral(next.Name))
	}

	restart := ""
	if next.Start != "" && next.Start != old.Start {
		restart = " RESTART WITH " + next.Start
	}

	// ALTER SEQUENCE always restates the options, so an unchanged sequence needs no statement.
	if restart != "" || old.Increment != next.Increment || old.Min != next.Min || old.Max != next.Max || old.Cycle != next.Cycle {
		statements = append(statements, "ALTER SEQUENCE "+m.table(ns, next.Name)+restart+" "+m.sequenceClauses(next))
	}

	return statements
}

func (m mssql) DropSequence(ns, name string) string { return "DROP SEQUENCE " + m.table(ns, name) }
