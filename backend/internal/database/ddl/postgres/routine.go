package ddlPostgres

import (
	"regexp"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

var languagePattern = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

// RoutineInput plans a PostgreSQL function (Procedure=false) or procedure.
// OldIdentity is the old routine's identity argument list ("integer, text"),
// which DROP needs and which the form payload does not carry.
type RoutineInput struct {
	Schema      string
	Procedure   bool
	Old         *dto.RoutineData
	New         *dto.RoutineData
	OldIdentity string
}

func (i RoutineInput) kind() string {
	return lo.Ternary(i.Procedure, "PROCEDURE", "FUNCTION")
}

// BuildRoutineCreate plans CREATE for a new routine.
func BuildRoutineCreate(input RoutineInput) []ddl.Statement {
	query := createRoutine(input, "CREATE ")
	if query == "" {
		return nil
	}

	return []ddl.Statement{{SQL: query, Phase: ddl.PhaseRoutines}}
}

// BuildRoutineEdit plans an edit: CREATE OR REPLACE when the signature is
// unchanged, otherwise DROP + CREATE (PostgreSQL cannot change a signature or
// return type in place).
func BuildRoutineEdit(input RoutineInput) []ddl.Statement {
	if input.Old == nil || input.New == nil {
		return nil
	}

	signatureChanged := lo.FromPtr(input.Old.Name) != lo.FromPtr(input.New.Name) ||
		!ddl.PtrStringsEqual(input.Old.Parameters, input.New.Parameters) ||
		!ddl.PtrStringsEqual(input.Old.Returns, input.New.Returns)

	if !signatureChanged {
		return BuildRoutineCreateOrReplace(input)
	}

	create := createRoutine(input, "CREATE ")
	if create == "" {
		return nil
	}

	return []ddl.Statement{
		BuildRoutineDrop(input.Schema, lo.FromPtr(input.Old.Name), input.OldIdentity, input.Procedure),
		{SQL: create, Phase: ddl.PhaseRoutines},
	}
}

// BuildRoutineCreateOrReplace plans CREATE OR REPLACE.
func BuildRoutineCreateOrReplace(input RoutineInput) []ddl.Statement {
	query := createRoutine(input, "CREATE OR REPLACE ")
	if query == "" {
		return nil
	}

	return []ddl.Statement{{SQL: query, Phase: ddl.PhaseRoutines}}
}

// BuildRoutineDrop is a RESTRICT drop addressed by identity arguments.
func BuildRoutineDrop(schema, name, identity string, procedure bool) ddl.Statement {
	kind := lo.Ternary(procedure, "PROCEDURE", "FUNCTION")

	return ddl.Statement{
		SQL:   "DROP " + kind + " " + quote.PostgresQualifiedTable(schema, name) + "(" + identity + ")",
		Phase: ddl.PhaseRoutines,
	}
}

func createRoutine(input RoutineInput, prefix string) string {
	routine := input.New
	if routine == nil || lo.FromPtr(routine.Name) == "" {
		return ""
	}

	language := strings.TrimSpace(lo.FromPtr(routine.Language))
	if language == "" {
		language = "plpgsql"
	}

	body := lo.FromPtr(routine.Body)
	if !languagePattern.MatchString(language) || strings.TrimSpace(body) == "" {
		return ""
	}

	parameters := lo.FromPtr(routine.Parameters)
	if parameters != "" && ddl.SQLExpression(parameters) == "" {
		return ""
	}

	query := prefix + input.kind() + " " + quote.PostgresQualifiedTable(input.Schema, *routine.Name) + "(" + parameters + ")"

	if !input.Procedure {
		returns := ddl.SQLExpression(lo.FromPtr(routine.Returns))
		if returns == "" {
			return ""
		}

		query += " RETURNS " + returns
	}

	return query + " LANGUAGE " + language + " AS " + dollarQuote(body)
}

// dollarQuote wraps body in a dollar-quote tag that does not occur inside it.
func dollarQuote(body string) string {
	tag := "$body$"
	for i := 0; strings.Contains(body, tag); i++ {
		tag = "$body" + strings.Repeat("x", i+1) + "$"
	}

	return tag + body + tag
}
