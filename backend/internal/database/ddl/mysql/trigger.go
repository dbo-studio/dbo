package ddlMysql

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

// triggerStatements plans the Triggers tab. MySQL has no ALTER TRIGGER, so an
// edit drops and recreates the trigger.
func triggerStatements(database, tableName string, rows []dto.MysqlTableTrigger, action contract.TreeNodeActionName) ([]ddl.Statement, error) {
	var statements []ddl.Statement

	add := func(sql string) {
		statements = append(statements, ddl.Statement{SQL: sql, Phase: ddl.PhaseTriggers})
	}

	create := func(trigger *dto.MysqlTableTriggerData) error {
		query, err := createTriggerStatement(database, tableName, trigger)
		if err != nil {
			return err
		}

		add(query)

		return nil
	}

	drop := func(name string) {
		add("DROP TRIGGER " + quote.MysqlQualifiedTable(database, name))
	}

	for _, trigger := range rows {
		switch {
		case lo.FromPtr(trigger.Deleted):
			if trigger.Old != nil && lo.FromPtr(trigger.Old.Name) != "" {
				drop(*trigger.Old.Name)
			}
		case trigger.New == nil:
		case action == contract.CreateTableAction || lo.FromPtr(trigger.Added):
			if err := create(trigger.New); err != nil {
				return nil, err
			}
		case trigger.Old != nil && triggerChanged(trigger.Old, trigger.New):
			if lo.FromPtr(trigger.Old.Name) != "" {
				drop(*trigger.Old.Name)
			}

			if err := create(trigger.New); err != nil {
				return nil, err
			}
		}
	}

	return statements, nil
}

func triggerChanged(oldTrigger, newTrigger *dto.MysqlTableTriggerData) bool {
	return lo.FromPtr(oldTrigger.Name) != lo.FromPtr(newTrigger.Name) ||
		triggerKeyword(oldTrigger.Timing) != triggerKeyword(newTrigger.Timing) ||
		triggerKeyword(oldTrigger.Event) != triggerKeyword(newTrigger.Event) ||
		strings.TrimSpace(lo.FromPtr(oldTrigger.Body)) != strings.TrimSpace(lo.FromPtr(newTrigger.Body))
}

func triggerKeyword(value *string) string {
	return strings.ToUpper(strings.TrimSpace(lo.FromPtr(value)))
}

func createTriggerStatement(database, table string, trigger *dto.MysqlTableTriggerData) (string, error) {
	name := lo.FromPtr(trigger.Name)
	timing, event := ddl.TriggerTiming(lo.FromPtr(trigger.Timing)), ddl.TriggerEvent(lo.FromPtr(trigger.Event))
	body := strings.TrimSpace(lo.FromPtr(trigger.Body))

	switch {
	case name == "":
		return "", fmt.Errorf("trigger needs a name")
	case timing != "BEFORE" && timing != "AFTER":
		return "", fmt.Errorf("trigger %q: timing must be BEFORE or AFTER", name)
	case event == "" || event == "TRUNCATE":
		return "", fmt.Errorf("trigger %q: event must be INSERT, UPDATE or DELETE", name)
	case body == "":
		return "", fmt.Errorf("trigger %q: body is required", name)
	}

	return "CREATE TRIGGER " + quote.MysqlQualifiedTable(database, name) + " " + timing + " " + event +
		" ON " + quote.MysqlQualifiedTable(database, table) + " FOR EACH ROW " + body, nil
}
