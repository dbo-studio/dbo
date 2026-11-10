package ddlPostgres

import (
	"fmt"
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
func BuildRoutineCreate(input RoutineInput) ([]ddl.Statement, error) {
	query, err := createRoutine(input, "CREATE ")
	if err != nil {
		return nil, err
	}

	return []ddl.Statement{{SQL: query, Phase: ddl.PhaseRoutines}}, nil
}

// BuildRoutineEdit plans an edit: CREATE OR REPLACE when the signature is
// unchanged, otherwise DROP + CREATE (PostgreSQL cannot change a signature or
// return type in place).
func BuildRoutineEdit(input RoutineInput) ([]ddl.Statement, error) {
	if input.Old == nil || input.New == nil {
		return nil, fmt.Errorf("missing %s definition", strings.ToLower(input.kind()))
	}

	signatureChanged := lo.FromPtr(input.Old.Name) != lo.FromPtr(input.New.Name) ||
		!ddl.PtrStringsEqual(input.Old.Parameters, input.New.Parameters) ||
		!ddl.PtrStringsEqual(input.Old.Returns, input.New.Returns)

	if !signatureChanged {
		return BuildRoutineCreateOrReplace(input)
	}

	create, err := createRoutine(input, "CREATE ")
	if err != nil {
		return nil, err
	}

	return []ddl.Statement{
		BuildRoutineDrop(input.Schema, lo.FromPtr(input.Old.Name), input.OldIdentity, input.Procedure),
		{SQL: create, Phase: ddl.PhaseRoutines},
	}, nil
}

// BuildRoutineCreateOrReplace plans CREATE OR REPLACE.
func BuildRoutineCreateOrReplace(input RoutineInput) ([]ddl.Statement, error) {
	query, err := createRoutine(input, "CREATE OR REPLACE ")
	if err != nil {
		return nil, err
	}

	return []ddl.Statement{{SQL: query, Phase: ddl.PhaseRoutines}}, nil
}

// BuildRoutineDrop is a RESTRICT drop addressed by identity arguments.
func BuildRoutineDrop(schema, name, identity string, procedure bool) ddl.Statement {
	kind := lo.Ternary(procedure, "PROCEDURE", "FUNCTION")

	return ddl.Statement{
		SQL:   "DROP " + kind + " " + quote.PostgresQualifiedTable(schema, name) + "(" + identity + ")",
		Phase: ddl.PhaseRoutines,
	}
}

func createRoutine(input RoutineInput, prefix string) (string, error) {
	routine := input.New
	kind := strings.ToLower(input.kind())

	if routine == nil || lo.FromPtr(routine.Name) == "" {
		return "", fmt.Errorf("%s needs a name", kind)
	}

	name := *routine.Name

	language := strings.TrimSpace(lo.FromPtr(routine.Language))
	if language == "" {
		language = "plpgsql"
	}

	if !languagePattern.MatchString(language) {
		return "", fmt.Errorf("%s %q: invalid language %q", kind, name, language)
	}

	body := lo.FromPtr(routine.Body)
	if strings.TrimSpace(body) == "" {
		return "", fmt.Errorf("%s %q: body is required", kind, name)
	}

	parameters := lo.FromPtr(routine.Parameters)
	if parameters != "" && ddl.SQLExpression(parameters) == "" {
		return "", fmt.Errorf("%s %q: parameters must not contain ';' or comments", kind, name)
	}

	query := prefix + input.kind() + " " + quote.PostgresQualifiedTable(input.Schema, name) + "(" + parameters + ")"

	if !input.Procedure {
		returns := ddl.SQLExpression(lo.FromPtr(routine.Returns))
		if returns == "" {
			return "", fmt.Errorf("function %q: a return type without ';' or comments is required", name)
		}

		query += " RETURNS " + returns
	}

	return query + " LANGUAGE " + language + " AS " + dollarQuote(body), nil
}

// dollarQuote wraps body in a dollar-quote tag that does not occur inside it.
func dollarQuote(body string) string {
	tag := "$body$"
	for i := 0; strings.Contains(body, tag); i++ {
		tag = "$body" + strings.Repeat("x", i+1) + "$"
	}

	return tag + body + tag
}
