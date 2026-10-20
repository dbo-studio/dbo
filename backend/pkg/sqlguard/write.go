package sqlguard

import (
	"errors"
	"fmt"

	"github.com/blastrain/vitess-sqlparser/sqlparser"
)

// ErrBlocked marks a statement the agent may not propose as a data change.
var ErrBlocked = errors.New("blocked")

// WriteStatement returns the one INSERT, UPDATE or DELETE (with a WHERE) in
// sql. Anything else is refused: reads belong to execute_sql, schema changes to
// propose_schema_change, and the destructive or unclear to the user's own hands.
func WriteStatement(sql string) (string, error) {
	classification := ClassifySQL(sql)

	switch {
	case len(classification.Statements) != 1:
		return "", fmt.Errorf("%w: exactly one statement is allowed", ErrBlocked)
	case classification.Class == ClassRead:
		return "", errors.New("this is a read-only statement; use execute_sql instead")
	case classification.Class == ClassDangerousDML:
		return "", fmt.Errorf("%w: UPDATE/DELETE without WHERE is not allowed", ErrBlocked)
	case classification.Class == ClassCatastrophicDDL:
		return "", fmt.Errorf("%w: destructive DDL (DROP/TRUNCATE) is not allowed from the agent; the user must run it manually", ErrBlocked)
	case classification.Class == ClassDDL:
		return "", errors.New("this is a schema change; use propose_schema_change instead")
	case classification.Class != ClassWriteDML:
		return "", fmt.Errorf("%w: statement could not be classified", ErrBlocked)
	}

	return classification.Statements[0], nil
}

// SampleQuery is a SELECT of the rows an UPDATE or DELETE would touch. It
// reports false for statements it cannot read, such as an INSERT or syntax
// the parser does not know; the row count is then all there is to show.
func SampleQuery(sql string, limit int) (string, bool) {
	statement, err := sqlparser.Parse(sql)
	if err != nil {
		return "", false
	}

	switch s := statement.(type) {
	case *sqlparser.Update:
		return sampleSelect(s.TableExprs, s.Where, limit)
	case *sqlparser.Delete:
		return sampleSelect(s.TableExprs, s.Where, limit)
	default:
		return "", false
	}
}

func sampleSelect(tables sqlparser.TableExprs, where *sqlparser.Where, limit int) (string, bool) {
	if where == nil {
		return "", false
	}

	return fmt.Sprintf("SELECT * FROM %s%s LIMIT %d", sqlparser.String(tables), sqlparser.String(where), limit), true
}
