package ddlSqlite

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

// triggerStatements plans the Triggers tab. SQLite has no ALTER TRIGGER, so an
// edit drops and recreates it. A recreated table loses its triggers, so then
// every row that is not deleted is created again.
func triggerStatements(tableName string, rows []dto.SQLiteTrigger, recreate bool) ([]ddl.Statement, error) {
	var statements []ddl.Statement

	add := func(sql string) {
		statements = append(statements, ddl.Statement{SQL: sql, Phase: ddl.PhaseTriggers})
	}

	drop := func(trigger *dto.SQLiteTriggerData) {
		if trigger != nil && lo.FromPtr(trigger.Name) != "" {
			add("DROP TRIGGER IF EXISTS " + quote.SqliteIdent(*trigger.Name))
		}
	}

	create := func(trigger *dto.SQLiteTriggerData) error {
		query, err := createTriggerStatement(tableName, trigger)
		if err != nil {
			return err
		}

		add(query)

		return nil
	}

	for _, trigger := range rows {
		switch {
		case lo.FromPtr(trigger.Deleted):
			if !recreate {
				drop(trigger.Old)
			}
		case trigger.New == nil:
		case recreate || lo.FromPtr(trigger.Added):
			if err := create(trigger.New); err != nil {
				return nil, err
			}
		case trigger.Old != nil && triggerChanged(trigger.Old, trigger.New):
			drop(trigger.Old)

			if err := create(trigger.New); err != nil {
				return nil, err
			}
		}
	}

	return statements, nil
}

func triggerChanged(oldTrigger, newTrigger *dto.SQLiteTriggerData) bool {
	return lo.FromPtr(oldTrigger.Name) != lo.FromPtr(newTrigger.Name) ||
		ddl.TriggerTiming(lo.FromPtr(oldTrigger.Timing)) != ddl.TriggerTiming(lo.FromPtr(newTrigger.Timing)) ||
		ddl.TriggerEvent(lo.FromPtr(oldTrigger.Event)) != ddl.TriggerEvent(lo.FromPtr(newTrigger.Event)) ||
		strings.TrimSpace(lo.FromPtr(oldTrigger.When)) != strings.TrimSpace(lo.FromPtr(newTrigger.When)) ||
		strings.TrimSpace(lo.FromPtr(oldTrigger.Body)) != strings.TrimSpace(lo.FromPtr(newTrigger.Body))
}

func createTriggerStatement(table string, trigger *dto.SQLiteTriggerData) (string, error) {
	name := lo.FromPtr(trigger.Name)
	timing, event := ddl.TriggerTiming(lo.FromPtr(trigger.Timing)), ddl.TriggerEvent(lo.FromPtr(trigger.Event))
	body := strings.TrimSpace(lo.FromPtr(trigger.Body))

	switch {
	case name == "":
		return "", fmt.Errorf("trigger needs a name")
	case timing == "" || event == "" || event == "TRUNCATE":
		return "", fmt.Errorf("trigger %q: timing must be BEFORE or AFTER and event INSERT, UPDATE or DELETE", name)
	case timing == "INSTEAD OF":
		return "", fmt.Errorf("trigger %q: INSTEAD OF triggers are only for views", name)
	case body == "":
		return "", fmt.Errorf("trigger %q: body is required", name)
	}

	query := "CREATE TRIGGER " + quote.SqliteIdent(name) + " " + timing + " " + event + " ON " + quote.SqliteIdent(table) + " FOR EACH ROW"

	if when := strings.TrimSpace(lo.FromPtr(trigger.When)); when != "" {
		expression := ddl.SQLExpression(when)
		if expression == "" {
			return "", fmt.Errorf("trigger %q: WHEN must be a single SQL expression without ';' or comments", name)
		}

		query += " WHEN " + expression
	}

	if !strings.HasSuffix(body, ";") {
		body += ";"
	}

	return query + " BEGIN " + body + " END", nil
}
