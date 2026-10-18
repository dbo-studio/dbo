package ddlPostgres

import (
	"strconv"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func sequenceRows(input TableInput) []dto.PostgresTableSequence {
	if input.Sequences == nil {
		return nil
	}

	return input.Sequences.Columns
}

// SequenceInput is the standalone sequence form (create / edit).
type SequenceInput struct {
	Schema string
	Old    *dto.PostgresSequenceData
	New    *dto.PostgresSequenceData
}

// BuildSequenceStatements plans the standalone Sequence form. Edit alters in
// place; PostgreSQL supports every field the form exposes.
func BuildSequenceStatements(input SequenceInput, action contract.TreeNodeActionName) []ddl.Statement {
	if input.New == nil {
		return nil
	}

	if action == contract.CreateSequenceAction {
		return createSequenceStatements(input.Schema, input.New, standaloneOwner(input.Schema, input.New.OwnedBy))
	}

	return alterSequenceStatements(input.Schema, input.Old, input.New, standaloneOwner(input.Schema, input.New.OwnedBy), standaloneOwner(input.Schema, oldOwnedBy(input.Old)))
}

// DropSequenceStatement is the RESTRICT drop used by the tree action.
func DropSequenceStatement(schema, name string) ddl.Statement {
	return ddl.Statement{SQL: "DROP SEQUENCE " + quote.PostgresQualifiedTable(schema, name), Phase: ddl.PhaseSequences}
}

// tableSequenceStatements plans the table Sequence tab. OwnedBy is a column of
// the edited table.
func tableSequenceStatements(schema, tableName string, rows []dto.PostgresTableSequence, action contract.TreeNodeActionName) []ddl.Statement {
	var statements []ddl.Statement

	owner := func(data *dto.PostgresSequenceData) string {
		if data == nil || lo.FromPtr(data.OwnedBy) == "" {
			return ""
		}

		return quote.PostgresQualifiedTable(schema, tableName) + "." + quote.PostgresIdent(*data.OwnedBy)
	}

	for _, row := range rows {
		switch {
		case lo.FromPtr(row.Deleted):
			if row.Old != nil && lo.FromPtr(row.Old.Name) != "" {
				statements = append(statements, DropSequenceStatement(schema, *row.Old.Name))
			}
		case row.New == nil:
		case action == contract.CreateTableAction || lo.FromPtr(row.Added):
			statements = append(statements, createSequenceStatements(schema, row.New, owner(row.New))...)
		case row.Old != nil:
			statements = append(statements, alterSequenceStatements(schema, row.Old, row.New, owner(row.New), owner(row.Old))...)
		}
	}

	return statements
}

func standaloneOwner(schema string, ownedBy *string) string {
	parts := strings.Split(strings.TrimSpace(lo.FromPtr(ownedBy)), ".")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return ""
	}

	return quote.PostgresQualifiedTable(schema, parts[0]) + "." + quote.PostgresIdent(parts[1])
}

func oldOwnedBy(old *dto.PostgresSequenceData) *string {
	if old == nil {
		return nil
	}

	return old.OwnedBy
}

// sequenceNumber returns value when it is a plain integer, else empty.
func sequenceNumber(value *string) string {
	trimmed := strings.TrimSpace(lo.FromPtr(value))
	if _, err := strconv.ParseInt(trimmed, 10, 64); err != nil {
		return ""
	}

	return trimmed
}

func createSequenceStatements(schema string, seq *dto.PostgresSequenceData, owner string) []ddl.Statement {
	if lo.FromPtr(seq.Name) == "" {
		return nil
	}

	ref := quote.PostgresQualifiedTable(schema, *seq.Name)
	query := "CREATE SEQUENCE " + ref

	for _, option := range []struct{ keyword, value string }{
		{"INCREMENT BY", sequenceNumber(seq.Increment)},
		{"MINVALUE", sequenceNumber(seq.MinValue)},
		{"MAXVALUE", sequenceNumber(seq.MaxValue)},
		{"START WITH", sequenceNumber(seq.Start)},
		{"CACHE", sequenceNumber(seq.Cache)},
	} {
		if option.value != "" {
			query += " " + option.keyword + " " + option.value
		}
	}

	if lo.FromPtr(seq.Cycle) {
		query += " CYCLE"
	}

	statements := []ddl.Statement{{SQL: query, Phase: ddl.PhaseSequences}}

	if owner != "" {
		statements = append(statements, ddl.Statement{SQL: "ALTER SEQUENCE " + ref + " OWNED BY " + owner, Phase: ddl.PhaseSequences})
	}

	if lo.FromPtr(seq.Comment) != "" {
		statements = append(statements, ddl.Statement{SQL: "COMMENT ON SEQUENCE " + ref + " IS " + quote.PostgresLiteral(*seq.Comment), Phase: ddl.PhaseSequences})
	}

	return statements
}

func alterSequenceStatements(schema string, old, seq *dto.PostgresSequenceData, owner, oldOwner string) []ddl.Statement {
	name := lo.FromPtr(old.Name)
	if name == "" {
		return nil
	}

	ref := quote.PostgresQualifiedTable(schema, name)

	var statements []ddl.Statement

	add := func(sql string) {
		statements = append(statements, ddl.Statement{SQL: sql, Phase: ddl.PhaseSequences})
	}

	var options []string

	for _, option := range []struct {
		keyword  string
		old, new string
	}{
		{"INCREMENT BY", sequenceNumber(old.Increment), sequenceNumber(seq.Increment)},
		{"MINVALUE", sequenceNumber(old.MinValue), sequenceNumber(seq.MinValue)},
		{"MAXVALUE", sequenceNumber(old.MaxValue), sequenceNumber(seq.MaxValue)},
		{"START WITH", sequenceNumber(old.Start), sequenceNumber(seq.Start)},
		{"CACHE", sequenceNumber(old.Cache), sequenceNumber(seq.Cache)},
	} {
		if option.new != "" && option.new != option.old {
			options = append(options, option.keyword+" "+option.new)
		}
	}

	if lo.FromPtr(old.Cycle) != lo.FromPtr(seq.Cycle) {
		options = append(options, lo.Ternary(lo.FromPtr(seq.Cycle), "CYCLE", "NO CYCLE"))
	}

	if len(options) > 0 {
		add("ALTER SEQUENCE " + ref + " " + strings.Join(options, " "))
	}

	if owner != oldOwner {
		add("ALTER SEQUENCE " + ref + " OWNED BY " + lo.Ternary(owner == "", "NONE", owner))
	}

	if newName := lo.FromPtr(seq.Name); newName != "" && newName != name {
		add("ALTER SEQUENCE " + ref + " RENAME TO " + quote.PostgresIdent(newName))
		name = newName
		ref = quote.PostgresQualifiedTable(schema, name)
	}

	if !ddl.PtrStringsEqual(old.Comment, seq.Comment) {
		add("COMMENT ON SEQUENCE " + ref + " IS " + quote.PostgresLiteral(lo.FromPtr(seq.Comment)))
	}

	return statements
}
