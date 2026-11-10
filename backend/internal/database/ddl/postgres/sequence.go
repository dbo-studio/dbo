package ddlPostgres

import (
	"fmt"
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
func BuildSequenceStatements(input SequenceInput, action contract.TreeNodeActionName) ([]ddl.Statement, error) {
	if input.New == nil {
		return nil, nil
	}

	owner, err := standaloneOwner(input.Schema, input.New.OwnedBy)
	if err != nil {
		return nil, err
	}

	if action == contract.CreateSequenceAction {
		return createSequenceStatements(input.Schema, input.New, owner)
	}

	// The old owner came from the catalog, so a malformed one only means "none".
	oldOwner, _ := standaloneOwner(input.Schema, oldOwnedBy(input.Old))

	return alterSequenceStatements(input.Schema, input.Old, input.New, owner, oldOwner)
}

// DropSequenceStatement is the RESTRICT drop used by the tree action.
func DropSequenceStatement(schema, name string) ddl.Statement {
	return ddl.Statement{SQL: "DROP SEQUENCE " + quote.PostgresQualifiedTable(schema, name), Phase: ddl.PhaseSequences}
}

// tableSequenceStatements plans the table Sequence tab. OwnedBy is a column of
// the edited table.
func tableSequenceStatements(schema, tableName string, rows []dto.PostgresTableSequence, action contract.TreeNodeActionName) ([]ddl.Statement, error) {
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
			created, err := createSequenceStatements(schema, row.New, owner(row.New))
			if err != nil {
				return nil, err
			}

			statements = append(statements, created...)
		case row.Old != nil:
			altered, err := alterSequenceStatements(schema, row.Old, row.New, owner(row.New), owner(row.Old))
			if err != nil {
				return nil, err
			}

			statements = append(statements, altered...)
		}
	}

	return statements, nil
}

// standaloneOwner turns "table.column" into a quoted reference; empty means no owner.
func standaloneOwner(schema string, ownedBy *string) (string, error) {
	raw := strings.TrimSpace(lo.FromPtr(ownedBy))
	if raw == "" {
		return "", nil
	}

	parts := strings.Split(raw, ".")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", fmt.Errorf("owned by must be written as table.column, got %q", raw)
	}

	return quote.PostgresQualifiedTable(schema, parts[0]) + "." + quote.PostgresIdent(parts[1]), nil
}

func oldOwnedBy(old *dto.PostgresSequenceData) *string {
	if old == nil {
		return nil
	}

	return old.OwnedBy
}

// sequenceNumber returns value when it is a plain integer. Empty means "not
// set"; anything else that is not an integer is an error.
func sequenceNumber(label string, value *string) (string, error) {
	trimmed := strings.TrimSpace(lo.FromPtr(value))
	if trimmed == "" {
		return "", nil
	}

	if _, err := strconv.ParseInt(trimmed, 10, 64); err != nil {
		return "", fmt.Errorf("%s must be an integer, got %q", label, trimmed)
	}

	return trimmed, nil
}

type sequenceOption struct{ keyword, value string }

// sequenceOptions reads the numeric options of one sequence.
func sequenceOptions(seq *dto.PostgresSequenceData) ([]sequenceOption, error) {
	options := make([]sequenceOption, 0, 5)

	for _, field := range []struct {
		keyword, label string
		value          *string
	}{
		{"INCREMENT BY", "increment", seq.Increment},
		{"MINVALUE", "min value", seq.MinValue},
		{"MAXVALUE", "max value", seq.MaxValue},
		{"START WITH", "start", seq.Start},
		{"CACHE", "cache", seq.Cache},
	} {
		value, err := sequenceNumber(field.label, field.value)
		if err != nil {
			return nil, err
		}

		options = append(options, sequenceOption{field.keyword, value})
	}

	return options, nil
}

func createSequenceStatements(schema string, seq *dto.PostgresSequenceData, owner string) ([]ddl.Statement, error) {
	if lo.FromPtr(seq.Name) == "" {
		return nil, fmt.Errorf("sequence needs a name")
	}

	options, err := sequenceOptions(seq)
	if err != nil {
		return nil, fmt.Errorf("sequence %q: %w", *seq.Name, err)
	}

	ref := quote.PostgresQualifiedTable(schema, *seq.Name)
	query := "CREATE SEQUENCE " + ref

	for _, option := range options {
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

	return statements, nil
}

func alterSequenceStatements(schema string, old, seq *dto.PostgresSequenceData, owner, oldOwner string) ([]ddl.Statement, error) {
	name := lo.FromPtr(old.Name)
	if name == "" {
		return nil, fmt.Errorf("sequence needs a name")
	}

	oldOptions, err := sequenceOptions(old)
	if err != nil {
		return nil, fmt.Errorf("sequence %q: %w", name, err)
	}

	newOptions, err := sequenceOptions(seq)
	if err != nil {
		return nil, fmt.Errorf("sequence %q: %w", name, err)
	}

	ref := quote.PostgresQualifiedTable(schema, name)

	var statements []ddl.Statement

	add := func(sql string) {
		statements = append(statements, ddl.Statement{SQL: sql, Phase: ddl.PhaseSequences})
	}

	var options []string

	for i, option := range newOptions {
		if option.value != "" && option.value != oldOptions[i].value {
			options = append(options, option.keyword+" "+option.value)
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

	return statements, nil
}
