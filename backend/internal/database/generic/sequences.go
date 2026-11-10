package databaseGeneric

import (
	"context"
	"errors"
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

// SequenceSpec is a sequence as the Object Form submits it: numbers stay text and are checked by integerText.
type SequenceSpec struct {
	Name, Start, Increment, Min, Max string
	Cycle                            bool
}

// SequenceDialect is implemented by dialects with CREATE SEQUENCE (SQL Server).
type SequenceDialect interface {
	Sequences(ctx context.Context, db *gorm.DB, namespace string) ([]string, error)
	SequenceRow(ctx context.Context, db *gorm.DB, namespace, name string) (map[string]any, error)
	CreateSequence(namespace string, s SequenceSpec) string
	// AlterSequence returns the statements that turn old into next (rename included).
	AlterSequence(namespace string, old, next SequenceSpec) []string
	DropSequence(namespace, name string) string
}

var integerText = regexp.MustCompile(`^-?\d{1,19}$`)

func (r *Repository) sequenceDialect() (SequenceDialect, bool) {
	d, ok := r.d.(SequenceDialect)

	return d, ok
}

func isSequenceAction(action contract.TreeNodeActionName) bool {
	return action == contract.CreateSequenceAction || action == contract.EditSequenceAction || action == contract.DropSequenceAction
}

func (r *Repository) sequenceFields() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "start_value", Name: "Start value", Type: contract.FormFieldTypeText},
		{ID: "increment_by", Name: "Increment by", Type: contract.FormFieldTypeText},
		{ID: "min_value", Name: "Min value", Type: contract.FormFieldTypeText},
		{ID: "max_value", Name: "Max value", Type: contract.FormFieldTypeText},
		{ID: "cycle", Name: "Cycle", Type: contract.FormFieldTypeCheckBox},
	}
}

func (r *Repository) sequenceForm(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	d, _ := r.sequenceDialect()
	ns, name := object(nodeID)
	row := map[string]any{"start_value": "1", "increment_by": "1", "cycle": false}

	if name != "" {
		var err error
		if row, err = d.SequenceRow(ctx, r.base.DB().WithContext(ctx), ns, name); err != nil {
			return nil, apperror.DriverError(err)
		}
	}

	return r.base.BuildGeneralFormResponse(r.sequenceFields(), row)
}

func sequenceSpec(d *dto.PostgresSequenceData) SequenceSpec {
	if d == nil {
		return SequenceSpec{}
	}

	text := func(p *string) string { return strings.TrimSpace(lo.FromPtr(p)) }

	return SequenceSpec{
		Name: text(d.Name), Start: text(d.Start), Increment: text(d.Increment), Min: text(d.MinValue), Max: text(d.MaxValue),
		Cycle: lo.FromPtr(d.Cycle),
	}
}

func (s SequenceSpec) validate() error {
	if !namespaceName.MatchString(s.Name) {
		return errors.New("a sequence name is letters, digits and underscores, and does not start with a digit")
	}

	for label, v := range map[string]string{"start value": s.Start, "increment": s.Increment, "min value": s.Min, "max value": s.Max} {
		if v != "" && !integerText.MatchString(v) {
			return fmt.Errorf("the %s must be a whole number", label)
		}
	}

	if s.Increment == "0" {
		return errors.New("the increment cannot be 0")
	}

	return nil
}

func (r *Repository) sequenceStatements(nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	d, _ := r.sequenceDialect()
	ns, name := object(nodeID)

	if action == contract.DropSequenceAction {
		if name == "" {
			return nil, apperror.Validation(errors.New("no sequence selected"))
		}

		return []string{d.DropSequence(ns, name)}, nil
	}

	tabs, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresSequenceParams](params)
	if err != nil {
		return nil, apperror.Validation(err)
	}

	tab := tabs[contract.SequenceTab]
	if tab == nil {
		tab = tabs[contract.GeneralTab]
	}

	if tab == nil || tab.New == nil {
		return nil, apperror.Validation(errors.New("the sequence definition is required"))
	}

	next := sequenceSpec(tab.New)
	if err := next.validate(); err != nil {
		return nil, apperror.Validation(err)
	}

	if action == contract.CreateSequenceAction {
		return []string{d.CreateSequence(ns, next)}, nil
	}

	// An edited form may carry only what changed: lay it over the old values.
	old := sequenceSpec(tab.Old)
	if old.Name == "" {
		old.Name = name
	}

	merged := old
	for _, f := range []struct{ dst, src *string }{{&merged.Name, &next.Name}, {&merged.Start, &next.Start}, {&merged.Increment, &next.Increment}, {&merged.Min, &next.Min}, {&merged.Max, &next.Max}} {
		if *f.src != "" {
			*f.dst = *f.src
		}
	}

	merged.Cycle = next.Cycle

	return d.AlterSequence(ns, old, merged), nil
}

func (r *Repository) hasSequences() bool {
	_, ok := r.sequenceDialect()

	return ok
}
