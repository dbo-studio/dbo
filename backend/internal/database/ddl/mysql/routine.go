package ddlMysql

import (
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
func BuildRoutineCreate(input RoutineInput) []ddl.Statement {
	query := createRoutine(input)
	if query == "" {
		return nil
	}

	return []ddl.Statement{{SQL: query, Phase: ddl.PhaseRoutines}}
}

// BuildRoutineEdit plans an edit as DROP + CREATE; MySQL ALTER ROUTINE cannot
// change the body or parameters.
func BuildRoutineEdit(input RoutineInput) []ddl.Statement {
	if input.Old == nil || lo.FromPtr(input.Old.Name) == "" {
		return nil
	}

	create := createRoutine(input)
	if create == "" {
		return nil
	}

	return []ddl.Statement{
		BuildRoutineDrop(input.Database, *input.Old.Name, input.Procedure),
		{SQL: create, Phase: ddl.PhaseRoutines},
	}
}

func BuildRoutineDrop(database, name string, procedure bool) ddl.Statement {
	return ddl.Statement{
		SQL:   "DROP " + routineKind(procedure) + " " + quote.MysqlQualifiedTable(database, name),
		Phase: ddl.PhaseRoutines,
	}
}

func createRoutine(input RoutineInput) string {
	routine := input.New
	if routine == nil || lo.FromPtr(routine.Name) == "" || strings.TrimSpace(lo.FromPtr(routine.Body)) == "" {
		return ""
	}

	parameters := lo.FromPtr(routine.Parameters)
	if parameters != "" && ddl.SQLExpression(parameters) == "" {
		return ""
	}

	query := "CREATE " + routineKind(input.Procedure) + " " + quote.MysqlQualifiedTable(input.Database, *routine.Name) + "(" + parameters + ")"

	if !input.Procedure {
		returns := ddl.SQLExpression(lo.FromPtr(routine.Returns))
		if returns == "" {
			return ""
		}

		query += " RETURNS " + returns

		if lo.FromPtr(routine.Deterministic) {
			query += " DETERMINISTIC"
		}
	}

	if comment := lo.FromPtr(routine.Comment); comment != "" {
		query += " COMMENT " + quote.MysqlLiteral(comment)
	}

	return query + " " + strings.TrimSpace(*routine.Body)
}
