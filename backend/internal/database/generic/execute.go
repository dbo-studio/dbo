package databaseGeneric

import (
	"context"
	"errors"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

var errUnsupportedForm = apperror.Validation(errors.New("this object type cannot be edited for this database yet"))

func (r *Repository) PreviewExecute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	ns, name := object(nodeID)

	switch action {
	case contract.ExecuteSQLAction:
		return databaseCore.SQLFromParams(params)
	case contract.DropTableAction:
		return []string{r.d.DropTable(ns, name)}, nil
	case contract.DropViewAction:
		return []string{r.d.DropView(ns, name)}, nil
	case contract.RenameAction:
		next, err := databaseCore.NewNameFromParams(params)
		if err != nil {
			return nil, apperror.Validation(err)
		}

		return []string{r.d.RenameTable(ns, name, next)}, nil
	case contract.CreateTableAction, contract.EditTableAction:
		return r.tableStatements(ctx, ns, name, action, params)
	case contract.CreateViewAction, contract.EditViewAction:
		return r.viewStatements(ns, name, action, params)
	default:
		return nil, errUnsupportedForm
	}
}

func (r *Repository) Execute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) (*contract.ExecuteResult, error) {
	queries, err := r.PreviewExecute(ctx, nodeID, action, params)
	if err != nil {
		return nil, err
	}

	for _, q := range queries {
		if q == "" {
			continue
		}

		if err := r.base.DB().WithContext(ctx).Exec(q).Error; err != nil {
			return nil, apperror.DriverError(err)
		}
	}

	return databaseCore.ResolveExecuteIdentity(r.base.Connection().ConnectionType, nodeID, action, params), nil
}

func (r *Repository) tableStatements(ctx context.Context, ns, name string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	general, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.MysqlTableParams](params)
	if err != nil {
		return nil, apperror.Validation(err)
	}

	columnTabs, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.MysqlTableColumnParams](params)
	if err != nil {
		return nil, apperror.Validation(err)
	}

	var columns []dto.MysqlTableColumn
	if tab := columnTabs[contract.TableColumnsTab]; tab != nil {
		columns = tab.Columns
	}

	var newName, oldName string

	if g := general[contract.GeneralTab]; g != nil {
		if g.New != nil {
			newName = lo.FromPtr(g.New.Name)
		}

		if g.Old != nil {
			oldName = lo.FromPtr(g.Old.Name)
		}
	}

	create := action == contract.CreateTableAction

	if oldName == "" {
		oldName = name
	}

	current := oldName
	if create {
		current = newName
	}

	queries := []string{}

	if create {
		if queries, err = r.createTable(ns, newName, columns); err != nil {
			return nil, err
		}
	} else if newName != "" && newName != oldName {
		queries = append(queries, r.d.RenameTable(ns, oldName, newName))
		current = newName
	}

	// Drops of the constraint tabs run before column changes (a column in use cannot go), adds after.
	drops, adds, _, err := r.constraintStatements(ns, current, params)
	if err != nil {
		return nil, err
	}

	keyDrops, keyAdds, keysSet, err := r.keyStatements(ctx, ns, current, params, create)
	if err != nil {
		return nil, err
	}

	queries = append(queries, drops...)
	queries = append(queries, keyDrops...)

	if !create {
		for _, row := range columns {
			statements, err := r.columnStatements(ns, current, row)
			if err != nil {
				return nil, err
			}

			queries = append(queries, statements...)
		}

		if !keysSet {
			pk, err := r.primaryKeyFromColumns(ctx, ns, current, columns)
			if err != nil {
				return nil, err
			}

			queries = append(queries, pk...)
		}
	}

	queries = append(queries, keyAdds...)

	return append(queries, adds...), nil
}

// primaryKeyFromColumns turns the Primary Key checkboxes of the Columns tab into a key replacement on an existing table.
func (r *Repository) primaryKeyFromColumns(ctx context.Context, ns, table string, rows []dto.MysqlTableColumn) ([]string, error) {
	c, ok := r.d.(Constraints)
	if !ok {
		return nil, nil
	}

	keys, err := c.Keys(ctx, r.base.DB().WithContext(ctx), ns, table)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	old := []string{}
	if pk, found := lo.Find(keys, func(k KeyInfo) bool { return k.Type == "PRIMARY KEY" }); found {
		old = pk.Columns
	}

	// Renames come first: the key follows a renamed column, so they are not a key change.
	for _, row := range rows {
		if row.Old != nil && row.New != nil && !lo.FromPtr(row.Added) && !lo.FromPtr(row.Deleted) && row.New.Name != nil {
			from, to := lo.FromPtr(row.Old.Name), *row.New.Name
			old = lo.Map(old, func(n string, _ int) string { return lo.Ternary(n == from, to, n) })
		}
	}

	next := append([]string{}, old...)

	for _, row := range rows {
		switch {
		case row.Old == nil && row.New == nil:
		case lo.FromPtr(row.Deleted):
			if row.Old != nil {
				next = lo.Without(next, lo.FromPtr(row.Old.Name))
			}
		case lo.FromPtr(row.Added):
			if row.New != nil && lo.FromPtr(row.New.Primary) && row.New.Name != nil {
				next = append(next, *row.New.Name)
			}
		case row.Old != nil && row.New != nil:
			merged := mergeColumn(row.Old, row.New)
			newName := lo.FromPtr(merged.Name)

			if lo.FromPtr(merged.Primary) && !lo.Contains(next, newName) {
				next = append(next, newName)
			}

			if !lo.FromPtr(merged.Primary) && lo.FromPtr(row.Old.Primary) {
				next = lo.Without(next, newName)
			}
		}
	}

	if sameSet(old, next) {
		return nil, nil
	}

	statements, err := c.ReplacePrimaryKey(ctx, r.base.DB().WithContext(ctx), ns, table, old, next)
	if err != nil {
		return nil, apperror.Validation(err)
	}

	return statements, nil
}

func (r *Repository) createTable(ns, name string, rows []dto.MysqlTableColumn) ([]string, error) {
	if strings.TrimSpace(name) == "" {
		return nil, apperror.Validation(errors.New("missing table name"))
	}

	specs := make([]ColSpec, 0, len(rows))

	for _, row := range rows {
		if row.New == nil || lo.FromPtr(row.Deleted) {
			continue
		}

		spec, err := r.d.ColumnSpec(row.New)
		if err != nil {
			return nil, apperror.Validation(err)
		}

		specs = append(specs, spec)
	}

	if len(specs) == 0 {
		return nil, apperror.Validation(errors.New("missing column definitions"))
	}

	return []string{r.d.CreateTable(ns, name, specs)}, nil
}

func (r *Repository) columnStatements(ns, table string, row dto.MysqlTableColumn) ([]string, error) {
	if row.New == nil && row.Old == nil {
		return nil, nil
	}

	switch {
	case lo.FromPtr(row.Deleted):
		old := row.Old
		if old == nil {
			old = row.New
		}

		return []string{r.d.DropColumn(ns, table, lo.FromPtr(old.Name))}, nil
	case lo.FromPtr(row.Added):
		spec, err := r.d.ColumnSpec(row.New)
		if err != nil {
			return nil, apperror.Validation(err)
		}

		return []string{r.d.AddColumn(ns, table, spec)}, nil
	case row.New == nil || row.Old == nil:
		return nil, nil
	}

	next, err := r.d.ColumnSpec(mergeColumn(row.Old, row.New))
	if err != nil {
		return nil, apperror.Validation(err)
	}

	old, err := r.d.ColumnSpec(row.Old)
	if err != nil {
		return nil, apperror.Validation(err)
	}

	statements, err := r.d.ChangeColumn(ns, table, old, next)
	if err != nil {
		return nil, apperror.Validation(err)
	}

	return statements, nil
}

// mergeColumn lets fields the form did not resubmit keep their old value.
func mergeColumn(old, next *dto.MysqlTableColumnData) *dto.MysqlTableColumnData {
	merged := *next

	if merged.Name == nil {
		merged.Name = old.Name
	}

	if merged.DataType == nil {
		merged.DataType, merged.MaxLength, merged.NumericScale = old.DataType, old.MaxLength, old.NumericScale
	}

	if merged.NotNull == nil {
		merged.NotNull = old.NotNull
	}

	if merged.Primary == nil {
		merged.Primary = old.Primary
	}

	if merged.IsIdentity == nil {
		merged.IsIdentity = old.IsIdentity
	}

	if merged.Default == nil {
		merged.Default = old.Default
	}

	return &merged
}

func (r *Repository) viewStatements(ns, name string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	views, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresViewParams](params)
	if err != nil {
		return nil, apperror.Validation(err)
	}

	view := views[contract.ViewTab]
	if view == nil || view.New == nil {
		return nil, apperror.Validation(errors.New("missing view definition"))
	}

	newName := lo.FromPtr(view.New.Name)
	query := strings.TrimRight(strings.TrimSpace(lo.FromPtr(view.New.Query)), "; \n\t")

	if action == contract.CreateViewAction {
		if newName == "" || query == "" {
			return nil, apperror.Validation(errors.New("a view needs a name and a query"))
		}

		return []string{r.d.CreateView(ns, newName, query, false)}, nil
	}

	queries := []string{}
	current := name

	if newName != "" && newName != name {
		queries = append(queries, r.d.RenameTable(ns, name, newName))
		current = newName
	}

	if query != "" {
		queries = append(queries, r.d.CreateView(ns, current, query, true))
	}

	return queries, nil
}
