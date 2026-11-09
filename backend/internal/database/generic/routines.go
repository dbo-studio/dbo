package databaseGeneric

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

// RoutineDialect is implemented by dialects with stored procedures and functions (SQL Server). A routine is
// edited as its whole CREATE statement: the form keeps one "definition" text, so nothing about parameters,
// return types or bodies has to be parsed back out of the server.
type RoutineDialect interface {
	Routines(ctx context.Context, db *gorm.DB, namespace string, procedures bool) ([]string, error)
	RoutineDefinition(ctx context.Context, db *gorm.DB, namespace, name string) (string, error)
	DropRoutine(namespace, name string, procedure bool) string
}

func (r *Repository) routineDialect() (RoutineDialect, bool) {
	d, ok := r.d.(RoutineDialect)

	return d, ok
}

func isRoutineAction(action contract.TreeNodeActionName) (procedure, ok bool) {
	switch action {
	case contract.CreateProcedureAction, contract.EditProcedureAction, contract.DropProcedureAction:
		return true, true
	case contract.CreateFunctionAction, contract.EditFunctionAction, contract.DropFunctionAction:
		return false, true
	}

	return false, false
}

func routineTab(procedure bool) contract.TreeTab {
	return lo.Ternary(procedure, contract.ProcedureTab, contract.FunctionTab)
}

// createRoutine accepts only a single CREATE [OR ALTER] PROCEDURE|PROC|FUNCTION statement, so the form
// cannot be used to run other DDL under its own (milder) Safe Mode class.
var createRoutine = regexp.MustCompile(`(?is)^\s*CREATE\s+(OR\s+ALTER\s+)?(PROCEDURE|PROC|FUNCTION)\s`)

var batchSeparator = regexp.MustCompile(`(?im)^\s*GO\s*$`)

func (r *Repository) routineForm(ctx context.Context, nodeID string, procedure bool) (*contract.FormResponse, error) {
	row := map[string]any{}
	ns, name := object(nodeID)

	if name != "" {
		d, _ := r.routineDialect()

		def, err := d.RoutineDefinition(ctx, r.base.DB().WithContext(ctx), ns, name)
		if err != nil {
			return nil, apperror.DriverError(err)
		}

		row = map[string]any{"name": name, "body": def}
	} else {
		kind := lo.Ternary(procedure, "PROCEDURE", "FUNCTION")
		tail := lo.Ternary(procedure, "AS\nBEGIN\n    SET NOCOUNT ON;\nEND", "RETURNS INT\nAS\nBEGIN\n    RETURN 1;\nEND")
		row = map[string]any{"body": fmt.Sprintf("CREATE %s %s.[new_routine]\n%s", kind, r.d.Quote(ns), tail)}
	}

	return r.base.BuildGeneralFormResponse([]contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "body", Name: "Definition", Type: contract.FormFieldTypeQuery, Required: true},
	}, row)
}

func (r *Repository) routineStatements(nodeID string, action contract.TreeNodeActionName, procedure bool, params []byte) ([]string, error) {
	d, _ := r.routineDialect()
	ns, name := object(nodeID)

	if action == contract.DropProcedureAction || action == contract.DropFunctionAction {
		if name == "" {
			return nil, apperror.Validation(fmt.Errorf("no routine selected"))
		}

		return []string{d.DropRoutine(ns, name, procedure)}, nil
	}

	tabs, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.RoutineParams](params)
	if err != nil {
		return nil, apperror.Validation(err)
	}

	tab := tabs[routineTab(procedure)]
	if tab == nil || tab.New == nil {
		return nil, apperror.Validation(fmt.Errorf("the routine definition is required"))
	}

	definition := strings.TrimSpace(lo.FromPtr(tab.New.Body))
	if !createRoutine.MatchString(definition) || batchSeparator.MatchString(definition) {
		return nil, apperror.Validation(fmt.Errorf("the definition must be one CREATE PROCEDURE or CREATE FUNCTION statement"))
	}

	if kind := strings.ToUpper(createRoutine.FindStringSubmatch(definition)[2]); procedure != strings.HasPrefix(kind, "PROC") {
		return nil, apperror.Validation(fmt.Errorf("the definition does not match a %s", lo.Ternary(procedure, "procedure", "function")))
	}

	// ALTER keeps permissions and dependencies; CREATE OR ALTER also covers a new routine.
	definition = createRoutine.ReplaceAllString(definition, "CREATE OR ALTER "+lo.Ternary(procedure, "PROCEDURE", "FUNCTION")+" ")

	return []string{definition}, nil
}

func (r *Repository) hasRoutines() bool {
	_, ok := r.routineDialect()

	return ok
}

func isRoutineContainer(t contract.TreeNodeType) (procedure, ok bool) {
	return t == contract.ProcedureContainerNodeType, t == contract.ProcedureContainerNodeType || t == contract.FunctionContainerNodeType
}

func isRoutineNode(t contract.TreeNodeType) (procedure, ok bool) {
	return t == contract.ProcedureNodeType, t == contract.ProcedureNodeType || t == contract.FunctionNodeType
}
