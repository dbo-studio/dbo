package ddlMysql

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

// RoutineInput plans a MySQL function or procedure.
type RoutineInput struct {
	Database  string
	Procedure bool
	Old       *dto.RoutineData
	New       *dto.RoutineData
}

func routineKind(procedure bool) string {
	return lo.Ternary(procedure, "PROCEDURE", "FUNCTION")
}

// BuildRoutineCreate plans CREATE for a new routine.
func BuildRoutineCreate(input RoutineInput) ([]ddl.Statement, error) {
	query, err := createRoutine(input)
	if err != nil {
		return nil, err
	}

	return []ddl.Statement{{SQL: query, Phase: ddl.PhaseRoutines}}, nil
}

// BuildRoutineEdit plans an edit as DROP + CREATE; MySQL ALTER ROUTINE cannot
// change the body or parameters.
func BuildRoutineEdit(input RoutineInput) ([]ddl.Statement, error) {
	if input.Old == nil || lo.FromPtr(input.Old.Name) == "" {
		return nil, fmt.Errorf("missing %s name", strings.ToLower(routineKind(input.Procedure)))
	}

	create, err := createRoutine(input)
	if err != nil {
		return nil, err
	}

	return []ddl.Statement{
		BuildRoutineDrop(input.Database, *input.Old.Name, input.Procedure),
		{SQL: create, Phase: ddl.PhaseRoutines},
	}, nil
}

func BuildRoutineDrop(database, name string, procedure bool) ddl.Statement {
	return ddl.Statement{
		SQL:   "DROP " + routineKind(procedure) + " " + quote.MysqlQualifiedTable(database, name),
		Phase: ddl.PhaseRoutines,
	}
}

func createRoutine(input RoutineInput) (string, error) {
	routine := input.New
	kind := strings.ToLower(routineKind(input.Procedure))

	if routine == nil || lo.FromPtr(routine.Name) == "" {
		return "", fmt.Errorf("%s needs a name", kind)
	}

	name := *routine.Name

	if strings.TrimSpace(lo.FromPtr(routine.Body)) == "" {
		return "", fmt.Errorf("%s %q: body is required", kind, name)
	}

	parameters := lo.FromPtr(routine.Parameters)
	if parameters != "" && ddl.SQLExpression(parameters) == "" {
		return "", fmt.Errorf("%s %q: parameters must not contain ';' or comments", kind, name)
	}

	query := "CREATE " + routineKind(input.Procedure) + " " + quote.MysqlQualifiedTable(input.Database, name) + "(" + parameters + ")"

	if !input.Procedure {
		returns := ddl.SQLExpression(lo.FromPtr(routine.Returns))
		if returns == "" {
			return "", fmt.Errorf("function %q: a return type without ';' or comments is required", name)
		}

		query += " RETURNS " + returns

		if lo.FromPtr(routine.Deterministic) {
			query += " DETERMINISTIC"
		}
	}

	if comment := lo.FromPtr(routine.Comment); comment != "" {
		query += " COMMENT " + quote.MysqlLiteral(comment)
	}

	return query + " " + strings.TrimSpace(*routine.Body), nil
}
