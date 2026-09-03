package sqlguard

import (
	"regexp"
	"strings"

	"github.com/blastrain/vitess-sqlparser/sqlparser"
)

type Class string

const (
	ClassRead            Class = "read"
	ClassWriteDML        Class = "write_dml"
	ClassDangerousDML    Class = "dangerous_dml"
	ClassDDL             Class = "ddl"
	ClassCatastrophicDDL Class = "catastrophic_ddl"
	ClassUnknown         Class = "unknown"
)

var (
	wherePattern        = regexp.MustCompile(`(?i)\bwhere\b`)
	dropPattern         = regexp.MustCompile(`(?i)^\s*drop\b`)
	truncatePattern     = regexp.MustCompile(`(?i)^\s*truncate\b`)
	alterPattern        = regexp.MustCompile(`(?i)^\s*alter\b`)
	createPattern       = regexp.MustCompile(`(?i)^\s*create\b`)
	insertPattern       = regexp.MustCompile(`(?i)^\s*insert\b`)
	updatePattern       = regexp.MustCompile(`(?i)^\s*update\b`)
	deletePattern       = regexp.MustCompile(`(?i)^\s*delete\b`)
	selectPattern       = regexp.MustCompile(`(?i)^\s*(with\b[\s\S]+)?select\b`)
	explainPattern      = regexp.MustCompile(`(?i)^\s*(explain|show|pragma|describe|desc)\b`)
	writableCTEPattern  = regexp.MustCompile(`(?i)^\s*with\b[\s\S]*\b(delete|insert|update|drop|truncate|alter|create)\b`)
	catastrophicPattern = regexp.MustCompile(`(?i)\b(drop|truncate)\b`)
)

// Classification is the result of classifying one or more statements.
type Classification struct {
	Class      Class    `json:"class"`
	Statements []string `json:"statements,omitempty"`
}

// Rank returns relative risk (higher = more dangerous).
func (c Class) Rank() int {
	switch c {
	case ClassRead:
		return 0
	case ClassWriteDML:
		return 1
	case ClassDDL:
		return 2
	case ClassDangerousDML:
		return 3
	case ClassUnknown:
		return 4
	case ClassCatastrophicDDL:
		return 5
	default:
		return 4
	}
}

// ClassifySQL classifies a SQL batch. The highest-risk statement wins.
func ClassifySQL(sql string) Classification {
	trimmed := strings.TrimSpace(sql)
	if trimmed == "" {
		return Classification{Class: ClassUnknown}
	}

	parts := splitStatements(trimmed)

	best := Classification{Class: ClassRead, Statements: parts}
	for _, part := range parts {
		class := classifySingle(part)
		if class.Rank() > best.Class.Rank() {
			best.Class = class
		}
	}

	return best
}

// ClassifyAction maps Object Form action names to a risk class.
func ClassifyAction(action string) Class {
	switch action {
	case "dropDatabase", "dropSchema", "dropTable", "dropView",
		"dropMaterializedView", "dropIndex", "dropSequence":
		if action == "dropIndex" || action == "dropSequence" {
			return ClassDDL
		}

		return ClassCatastrophicDDL
	case "createDatabase", "editDatabase", "createSchema", "editSchema",
		"createTable", "editTable", "createView", "editView",
		"createMaterializedView", "editMaterializedView",
		"createIndex", "editIndex", "createSequence", "editSequence":
		return ClassDDL
	default:
		return ClassUnknown
	}
}

// splitStatements splits a SQL batch on statement boundaries. Semicolons inside
// string literals, quoted identifiers, and comments are not boundaries.
func splitStatements(sql string) []string {
	parts := make([]string, 0, 4)

	var sb strings.Builder

	flush := func() {
		if part := strings.TrimSpace(sb.String()); part != "" {
			parts = append(parts, part)
		}

		sb.Reset()
	}

	var (
		inSingle, inDouble, inBacktick bool
		inLineComment, inBlockComment  bool
	)

	runes := []rune(sql)
	for i := 0; i < len(runes); i++ {
		ch := runes[i]

		switch {
		case inLineComment:
			sb.WriteRune(ch)

			if ch == '\n' {
				inLineComment = false
			}

		case inBlockComment:
			sb.WriteRune(ch)

			if ch == '*' && i+1 < len(runes) && runes[i+1] == '/' {
				sb.WriteRune('/')

				i++
				inBlockComment = false
			}

		case inSingle:
			sb.WriteRune(ch)

			if ch == '\'' {
				if i+1 < len(runes) && runes[i+1] == '\'' {
					sb.WriteRune('\'')

					i++
				} else {
					inSingle = false
				}
			}

		case inDouble:
			sb.WriteRune(ch)

			if ch == '"' {
				if i+1 < len(runes) && runes[i+1] == '"' {
					sb.WriteRune('"')

					i++
				} else {
					inDouble = false
				}
			}

		case inBacktick:
			sb.WriteRune(ch)

			if ch == '`' {
				inBacktick = false
			}

		case ch == '-' && i+1 < len(runes) && runes[i+1] == '-':
			inLineComment = true

			sb.WriteRune(ch)

		case ch == '/' && i+1 < len(runes) && runes[i+1] == '*':
			inBlockComment = true

			sb.WriteRune(ch)

		case ch == '\'':
			inSingle = true

			sb.WriteRune(ch)

		case ch == '"':
			inDouble = true

			sb.WriteRune(ch)

		case ch == '`':
			inBacktick = true

			sb.WriteRune(ch)

		case ch == ';':
			flush()

		default:
			sb.WriteRune(ch)
		}
	}

	flush()

	if len(parts) == 0 {
		return []string{sql}
	}

	return parts
}

func classifySingle(sql string) Class {
	trimmed := strings.TrimSpace(sql)
	if trimmed == "" {
		return ClassUnknown
	}

	if dropPattern.MatchString(trimmed) || truncatePattern.MatchString(trimmed) {
		return ClassCatastrophicDDL
	}

	// Writable CTEs (WITH x AS (DELETE ... RETURNING ...) SELECT ...) parse as
	// plain selects but mutate data; classify them by their mutating body.
	if writableCTEPattern.MatchString(trimmed) {
		if catastrophicPattern.MatchString(trimmed) {
			return ClassCatastrophicDDL
		}

		return ClassWriteDML
	}

	stmt, err := sqlparser.Parse(trimmed)
	if err == nil {
		return classifyParsed(stmt, trimmed)
	}

	return classifyHeuristic(trimmed)
}

func classifyParsed(stmt sqlparser.Statement, raw string) Class {
	switch s := stmt.(type) {
	case *sqlparser.Select:
		return ClassRead
	case *sqlparser.Insert:
		return ClassWriteDML
	case *sqlparser.Update:
		if s.Where == nil && !wherePattern.MatchString(raw) {
			return ClassDangerousDML
		}

		return ClassWriteDML
	case *sqlparser.Delete:
		if s.Where == nil && !wherePattern.MatchString(raw) {
			return ClassDangerousDML
		}

		return ClassWriteDML
	case *sqlparser.DDL:
		action := strings.ToLower(s.Action)
		if action == "drop" || action == "truncate" {
			return ClassCatastrophicDDL
		}

		return ClassDDL
	default:
		return classifyHeuristic(raw)
	}
}

func classifyHeuristic(sql string) Class {
	switch {
	case explainPattern.MatchString(sql) || selectPattern.MatchString(sql):
		return ClassRead
	case dropPattern.MatchString(sql) || truncatePattern.MatchString(sql):
		return ClassCatastrophicDDL
	case alterPattern.MatchString(sql) || createPattern.MatchString(sql):
		return ClassDDL
	case deletePattern.MatchString(sql) || updatePattern.MatchString(sql):
		if !wherePattern.MatchString(sql) {
			return ClassDangerousDML
		}

		return ClassWriteDML
	case insertPattern.MatchString(sql):
		return ClassWriteDML
	default:
		return ClassUnknown
	}
}
