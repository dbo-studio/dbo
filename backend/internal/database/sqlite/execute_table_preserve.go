package databaseSqlite

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

// columnEdits records how the submitted column rows change the existing
// columns, so objects that survive a table recreate follow them.
type columnEdits struct {
	renamed map[string]string
	dropped map[string]bool
}

func newColumnEdits(columnParams *dto.SQLiteTableColumnParams) columnEdits {
	edits := columnEdits{renamed: map[string]string{}, dropped: map[string]bool{}}
	if columnParams == nil {
		return edits
	}

	for _, col := range columnParams.Columns {
		if col.Old == nil || lo.FromPtr(col.Old.Name) == "" || lo.FromPtr(col.Added) {
			continue
		}

		oldName := *col.Old.Name

		switch {
		case lo.FromPtr(col.Deleted):
			edits.dropped[oldName] = true
		case col.New != nil && lo.FromPtr(col.New.Name) != "" && *col.New.Name != oldName:
			edits.renamed[oldName] = *col.New.Name
		}
	}

	return edits
}

// follow maps column names through the edits; false means a column is gone.
func (e columnEdits) follow(columns []string) ([]string, bool) {
	followed := make([]string, len(columns))

	for i, name := range columns {
		if e.dropped[name] {
			return nil, false
		}

		followed[i] = name
		if renamed, ok := e.renamed[name]; ok {
			followed[i] = renamed
		}
	}

	return followed, true
}

// A recreated table loses its indexes, triggers and checks. The form submits
// only changed rows, so the unchanged ones are read back from the database and
// added to the submitted rows.

func (r *SQLiteRepository) preserveIndexes(ctx context.Context, params *dto.SQLiteIndexParams, table string, edits columnEdits) *dto.SQLiteIndexParams {
	if params == nil {
		params = &dto.SQLiteIndexParams{}
	}

	existing, err := r.tableIndexes(ctx, table)
	if err != nil {
		return params
	}

	sent := map[string]bool{}

	for _, row := range params.Indexes {
		if row.Old != nil {
			sent[lo.FromPtr(row.Old.Name)] = true
		}
	}

	for _, index := range existing {
		columns, ok := edits.follow(index.Columns)
		if sent[index.Name] || !ok {
			continue
		}

		data := &dto.SQLiteIndexData{
			Name:    lo.ToPtr(index.Name),
			Columns: columns,
			Unique:  lo.ToPtr(index.Unique),
			Order:   lo.ToPtr(index.Order),
		}
		params.Indexes = append(params.Indexes, dto.SQLiteIndex{New: data, Old: data})
	}

	return params
}

func (r *SQLiteRepository) preserveTriggers(ctx context.Context, params *dto.SQLiteTriggerParams, table string) *dto.SQLiteTriggerParams {
	if params == nil {
		params = &dto.SQLiteTriggerParams{}
	}

	existing, err := r.tableTriggers(ctx, table)
	if err != nil {
		return params
	}

	sent := map[string]bool{}

	for _, row := range params.Triggers {
		if row.Old != nil {
			sent[lo.FromPtr(row.Old.Name)] = true
		}
	}

	for _, trigger := range existing {
		if sent[trigger.Name] {
			continue
		}

		data := &dto.SQLiteTriggerData{
			Name:   lo.ToPtr(trigger.Name),
			Timing: lo.ToPtr(trigger.Timing),
			Event:  lo.ToPtr(trigger.Event),
			When:   lo.ToPtr(trigger.When),
			Body:   lo.ToPtr(trigger.Body),
		}
		params.Triggers = append(params.Triggers, dto.SQLiteTrigger{New: data, Old: data})
	}

	return params
}

func (r *SQLiteRepository) preserveChecks(ctx context.Context, params *dto.SQLiteCheckParams, table string) *dto.SQLiteCheckParams {
	if params == nil {
		params = &dto.SQLiteCheckParams{}
	}

	tableDDL, err := r.getTableDDL(ctx, table)
	if err != nil {
		return params
	}

	sent := map[string]bool{}

	for _, row := range params.Checks {
		if row.Old != nil {
			sent[checkKey(row.Old.Name, row.Old.Expression)] = true
		}
	}

	for _, check := range parseChecks(tableDDL) {
		if sent[checkKey(&check.Name, &check.Expression)] {
			continue
		}

		data := &dto.SQLiteCheckData{Name: lo.ToPtr(check.Name), Expression: lo.ToPtr(check.Expression)}
		params.Checks = append(params.Checks, dto.SQLiteCheck{New: data, Old: data})
	}

	return params
}

func checkKey(name, expression *string) string {
	return lo.FromPtr(name) + "\x00" + lo.FromPtr(expression)
}
