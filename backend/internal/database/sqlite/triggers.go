package databaseSqlite

import (
	"context"
	"regexp"
	"strings"
)

type tableTrigger struct {
	Name   string
	Timing string
	Event  string
	When   string
	Body   string
}

var triggerSQLPattern = regexp.MustCompile(`(?is)^\s*CREATE\s+(?:TEMP(?:ORARY)?\s+)?TRIGGER\s+(?:IF\s+NOT\s+EXISTS\s+)?.+?\s+(BEFORE|AFTER|INSTEAD\s+OF)\s+(INSERT|UPDATE|DELETE)\s+ON\s+\S+\s+(?:FOR\s+EACH\s+ROW\s+)?(?:WHEN\s+(.+?)\s+)?BEGIN\s+(.*?)\s*END\s*;?\s*$`)

// tableTriggers lists the triggers of a table, parsed from sqlite_master. A
// trigger whose SQL does not fit the editable shape is left out.
func (r *SQLiteRepository) tableTriggers(ctx context.Context, table string) ([]tableTrigger, error) {
	type triggerRow struct {
		Name string `gorm:"column:name"`
		SQL  string `gorm:"column:sql"`
	}

	var rows []triggerRow

	err := r.base.DB().WithContext(ctx).Raw(
		"SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND tbl_name = ? ORDER BY name", table,
	).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	triggers := make([]tableTrigger, 0, len(rows))

	for _, row := range rows {
		match := triggerSQLPattern.FindStringSubmatch(row.SQL)
		if match == nil {
			continue
		}

		triggers = append(triggers, tableTrigger{
			Name:   row.Name,
			Timing: strings.ToUpper(strings.Join(strings.Fields(match[1]), " ")),
			Event:  strings.ToUpper(match[2]),
			When:   strings.TrimSpace(match[3]),
			Body:   strings.TrimSpace(match[4]),
		})
	}

	return triggers, nil
}
