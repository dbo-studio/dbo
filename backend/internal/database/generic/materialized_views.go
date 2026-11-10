package databaseGeneric

import (
	"context"
	"errors"
	"regexp"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

// MaterializedViewSpec is a materialized view as the Object Form submits it.
type MaterializedViewSpec struct {
	Name string
	// Target is an existing table the view writes to (ClickHouse TO clause). Empty means the view owns an inner table.
	Target string
	// OrderBy is the sorting key of the inner table; only used when Target is empty.
	OrderBy string
	Query   string
}

// MaterializedViewDialect is implemented by dialects with materialized views as their own object kind (ClickHouse).
// Views() of such a dialect may still list them, so editability checks keep treating them as read-only.
type MaterializedViewDialect interface {
	MaterializedViews(ctx context.Context, db *gorm.DB, namespace string) ([]string, error)
	MaterializedViewRow(ctx context.Context, db *gorm.DB, namespace, name string) (map[string]any, error)
	CreateMaterializedView(namespace string, s MaterializedViewSpec) (string, error)
	// AlterMaterializedView returns the statements that turn old into next, or an error when that would lose data.
	AlterMaterializedView(namespace string, old, next MaterializedViewSpec) ([]string, error)
	DropMaterializedView(namespace, name string) string
}

var mvTarget = regexp.MustCompile("^[A-Za-z_][A-Za-z0-9_]*(\\.[A-Za-z_][A-Za-z0-9_]*)?$")

func (r *Repository) materializedViewDialect() (MaterializedViewDialect, bool) {
	d, ok := r.d.(MaterializedViewDialect)

	return d, ok
}

func (r *Repository) hasMaterializedViews() bool {
	_, ok := r.materializedViewDialect()

	return ok
}

func isMaterializedViewAction(action contract.TreeNodeActionName) bool {
	return action == contract.CreateMaterializedViewAction || action == contract.EditMaterializedViewAction || action == contract.DropMaterializedViewAction
}

func (r *Repository) materializedViewForm(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	d, _ := r.materializedViewDialect()
	ns, name := object(nodeID)
	row := map[string]any{}

	if name != "" {
		var err error
		if row, err = d.MaterializedViewRow(ctx, r.base.DB().WithContext(ctx), ns, name); err != nil {
			return nil, apperror.DriverError(err)
		}
	}

	return r.base.BuildGeneralFormResponse([]contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "target", Name: "Target table (TO, optional: empty keeps the data in an inner table)", Type: contract.FormFieldTypeText},
		{ID: "order_by", Name: "Inner table ORDER BY (default tuple())", Type: contract.FormFieldTypeText},
		{ID: "query", Name: "Query", Type: contract.FormFieldTypeQuery, Required: true},
	}, row)
}

func (r *Repository) materializedViewStatements(nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	d, _ := r.materializedViewDialect()
	ns, name := object(nodeID)

	if action == contract.DropMaterializedViewAction {
		if name == "" {
			return nil, apperror.Validation(errors.New("no materialized view selected"))
		}

		return []string{d.DropMaterializedView(ns, name)}, nil
	}

	tabs, err := helper.ConvertToDTO[map[contract.TreeTab]*struct {
		New map[string]any `json:"new"`
		Old map[string]any `json:"old"`
	}](params)
	if err != nil {
		return nil, apperror.Validation(err)
	}

	tab := tabs[contract.MaterializedViewTab]
	if tab == nil {
		tab = tabs[contract.GeneralTab]
	}

	if tab == nil || tab.New == nil {
		return nil, apperror.Validation(errors.New("the materialized view definition is required"))
	}

	old := mvSpec(stringMap(tab.Old))
	if old.Name == "" {
		old.Name = name
	}

	// An edited form may carry only what changed: lay it over the old values.
	next := mvSpec(stringMap(tab.New))
	merged := old

	for _, f := range []struct{ dst, src *string }{{&merged.Name, &next.Name}, {&merged.Target, &next.Target}, {&merged.OrderBy, &next.OrderBy}, {&merged.Query, &next.Query}} {
		if *f.src != "" {
			*f.dst = *f.src
		}
	}

	if !namespaceName.MatchString(merged.Name) {
		return nil, apperror.Validation(errors.New("a view name is letters, digits and underscores, and does not start with a digit"))
	}

	if merged.Target != "" && !mvTarget.MatchString(merged.Target) {
		return nil, apperror.Validation(errors.New("the target must be a table name, optionally database.table"))
	}

	merged.Query = strings.TrimRight(strings.TrimSpace(merged.Query), "; \n\t")
	if merged.Query == "" {
		return nil, apperror.Validation(errors.New("a materialized view needs a query"))
	}

	if action == contract.CreateMaterializedViewAction {
		sql, err := d.CreateMaterializedView(ns, merged)
		if err != nil {
			return nil, apperror.Validation(err)
		}

		return []string{sql}, nil
	}

	statements, err := d.AlterMaterializedView(ns, old, merged)
	if err != nil {
		return nil, apperror.Validation(err)
	}

	return statements, nil
}

func mvSpec(m map[string]string) MaterializedViewSpec {
	return MaterializedViewSpec{Name: m["name"], Target: m["target"], OrderBy: m["order_by"], Query: m["query"]}
}

// withoutMaterialized removes materialized views from a list of view names, for dialects that list them separately.
func (r *Repository) withoutMaterialized(ctx context.Context, db *gorm.DB, namespace string, views []string) ([]string, error) {
	d, ok := r.materializedViewDialect()
	if !ok {
		return views, nil
	}

	materialized, err := d.MaterializedViews(ctx, db, namespace)
	if err != nil {
		return nil, err
	}

	return lo.Without(views, materialized...), nil
}
