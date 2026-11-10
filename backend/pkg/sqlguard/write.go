package sqlguard

import (
	"errors"
	"fmt"
	"strings"

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

// WriteTarget is what a data change works on: its kind (INSERT, UPDATE, DELETE),
// its one table, and for an UPDATE the columns it sets. It reports false for
// statements the parser cannot read or that touch more than one table.
type WriteTarget struct {
	Kind       string
	Table      string
	SetColumns []string
}

func ParseWriteTarget(sql string) (WriteTarget, bool) {
	statement, err := sqlparser.Parse(sql)
	if err != nil {
		return WriteTarget{}, false
	}

	switch s := statement.(type) {
	case *sqlparser.Insert:
		return WriteTarget{Kind: "INSERT", Table: s.Table.Name.String()}, true
	case *sqlparser.Update:
		table, ok := singleTable(s.TableExprs)
		if !ok {
			return WriteTarget{}, false
		}

		columns := make([]string, 0, len(s.Exprs))
		for _, expr := range s.Exprs {
			columns = append(columns, expr.Name.Name.String())
		}

		return WriteTarget{Kind: "UPDATE", Table: table, SetColumns: columns}, true
	case *sqlparser.Delete:
		table, ok := singleTable(s.TableExprs)
		if !ok {
			return WriteTarget{}, false
		}

		return WriteTarget{Kind: "DELETE", Table: table}, true
	default:
		return WriteTarget{}, false
	}
}

func singleTable(tables sqlparser.TableExprs) (string, bool) {
	if len(tables) != 1 {
		return "", false
	}

	aliased, ok := tables[0].(*sqlparser.AliasedTableExpr)
	if !ok {
		return "", false
	}

	name, ok := aliased.Expr.(sqlparser.TableName)
	if !ok {
		return "", false
	}

	return name.Name.String(), true
}

// SelectStatement returns the one SELECT (or WITH … SELECT) in sql, such as the body of a view.
func SelectStatement(sql string) (string, error) {
	classification := ClassifySQL(sql)
	if len(classification.Statements) != 1 || classification.Class != ClassRead {
		return "", fmt.Errorf("%w: a view must be exactly one SELECT", ErrBlocked)
	}

	statement := strings.TrimSpace(classification.Statements[0])
	if keyword, _, _ := strings.Cut(strings.ToUpper(statement), " "); keyword != "SELECT" && keyword != "WITH" {
		return "", fmt.Errorf("%w: a view must be exactly one SELECT", ErrBlocked)
	}

	return statement, nil
}
