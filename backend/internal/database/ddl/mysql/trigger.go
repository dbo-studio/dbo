package ddlMysql

import (
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

// triggerStatements plans the Triggers tab. MySQL has no ALTER TRIGGER, so an
// edit drops and recreates the trigger.
func triggerStatements(database, tableName string, rows []dto.MysqlTableTrigger, action contract.TreeNodeActionName) []ddl.Statement {
	var statements []ddl.Statement

	add := func(sql string) {
		statements = append(statements, ddl.Statement{SQL: sql, Phase: ddl.PhaseTriggers})
	}

	create := func(trigger *dto.MysqlTableTriggerData) {
		if query := createTriggerStatement(database, tableName, trigger); query != "" {
			add(query)
		}
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
			create(trigger.New)
		case trigger.Old != nil && triggerChanged(trigger.Old, trigger.New):
			if lo.FromPtr(trigger.Old.Name) != "" {
				drop(*trigger.Old.Name)
			}

			create(trigger.New)
		}
	}

	return statements
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

func createTriggerStatement(database, table string, trigger *dto.MysqlTableTriggerData) string {
	timing, event := ddl.TriggerTiming(lo.FromPtr(trigger.Timing)), ddl.TriggerEvent(lo.FromPtr(trigger.Event))
	body := strings.TrimSpace(lo.FromPtr(trigger.Body))

	if lo.FromPtr(trigger.Name) == "" || body == "" || event == "" || (timing != "BEFORE" && timing != "AFTER") || event == "TRUNCATE" {
		return ""
	}

	return "CREATE TRIGGER " + quote.MysqlQualifiedTable(database, *trigger.Name) + " " + timing + " " + event +
		" ON " + quote.MysqlQualifiedTable(database, table) + " FOR EACH ROW " + body
}
