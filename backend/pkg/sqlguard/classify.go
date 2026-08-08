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
	statementSplitPattern = regexp.MustCompile(`;\s*`)
	wherePattern          = regexp.MustCompile(`(?i)\bwhere\b`)
	dropPattern           = regexp.MustCompile(`(?i)^\s*drop\b`)
	truncatePattern       = regexp.MustCompile(`(?i)^\s*truncate\b`)
	alterPattern          = regexp.MustCompile(`(?i)^\s*alter\b`)
	createPattern         = regexp.MustCompile(`(?i)^\s*create\b`)
	insertPattern         = regexp.MustCompile(`(?i)^\s*insert\b`)
	updatePattern         = regexp.MustCompile(`(?i)^\s*update\b`)
	deletePattern         = regexp.MustCompile(`(?i)^\s*delete\b`)
	selectPattern         = regexp.MustCompile(`(?i)^\s*(with\b[\s\S]+)?select\b`)
	explainPattern        = regexp.MustCompile(`(?i)^\s*(explain|show|pragma|describe|desc)\b`)
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

func splitStatements(sql string) []string {
	raw := statementSplitPattern.Split(sql, -1)

	parts := make([]string, 0, len(raw))
	for _, part := range raw {
		part = strings.TrimSpace(part)
		if part != "" {
			parts = append(parts, part)
		}
	}

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
