package ddlPostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func triggerRows(input TableInput) []dto.PostgresTableTrigger {
	if input.Triggers == nil {
		return nil
	}

	return input.Triggers.Columns
}

// triggerStatements plans the Triggers tab. Edits drop and recreate the
// trigger; a rename or comment-only change is applied in place.
func triggerStatements(schema, tableName string, rows []dto.PostgresTableTrigger, action contract.TreeNodeActionName) ([]ddl.Statement, error) {
	tableRef := quote.PostgresQualifiedTable(schema, tableName)

	var statements []ddl.Statement

	add := func(sql string) {
		statements = append(statements, ddl.Statement{SQL: sql, Phase: ddl.PhaseTriggers})
	}

	create := func(trigger *dto.PostgresTableTriggerData) error {
		query, err := createTriggerStatement(tableRef, trigger)
		if err != nil {
			return err
		}

		add(query)

		if lo.FromPtr(trigger.Comment) != "" {
			add("COMMENT ON TRIGGER " + quote.PostgresIdent(*trigger.Name) + " ON " + tableRef + " IS " + quote.PostgresLiteral(*trigger.Comment))
		}

		return nil
	}

	drop := func(name string) {
		add("DROP TRIGGER " + quote.PostgresIdent(name) + " ON " + tableRef)
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
		case trigger.Old != nil:
			if triggerDefinitionChanged(trigger.Old, trigger.New) {
				if lo.FromPtr(trigger.Old.Name) != "" {
					drop(*trigger.Old.Name)
				}

				if err := create(trigger.New); err != nil {
					return nil, err
				}

				continue
			}

			name := lo.FromPtr(trigger.Old.Name)
			if newName := lo.FromPtr(trigger.New.Name); newName != "" && newName != name {
				add("ALTER TRIGGER " + quote.PostgresIdent(name) + " ON " + tableRef + " RENAME TO " + quote.PostgresIdent(newName))
				name = newName
			}

			if !ddl.PtrStringsEqual(trigger.Old.Comment, trigger.New.Comment) && name != "" {
				add("COMMENT ON TRIGGER " + quote.PostgresIdent(name) + " ON " + tableRef + " IS " + quote.PostgresLiteral(lo.FromPtr(trigger.New.Comment)))
			}
		}
	}

	return statements, nil
}

func triggerDefinitionChanged(oldTrigger, newTrigger *dto.PostgresTableTriggerData) bool {
	return ddl.TriggerTiming(lo.FromPtr(oldTrigger.Timing)) != ddl.TriggerTiming(lo.FromPtr(newTrigger.Timing)) ||
		orientationOrDefault(oldTrigger.Orientation) != orientationOrDefault(newTrigger.Orientation) ||
		!ddl.PtrStringsEqual(oldTrigger.When, newTrigger.When) ||
		!ddl.PtrStringsEqual(oldTrigger.Function, newTrigger.Function) ||
		!ddl.StringSlicesEqual(triggerEvents(oldTrigger.Events), triggerEvents(newTrigger.Events))
}

func orientationOrDefault(orientation *string) string {
	if strings.EqualFold(strings.TrimSpace(lo.FromPtr(orientation)), "ROW") {
		return "ROW"
	}

	return "STATEMENT"
}

// triggerEvents canonicalises events in a fixed order so reordering the
// multi-select does not count as a change.
func triggerEvents(events []string) []string {
	var result []string

	for _, event := range []string{"INSERT", "UPDATE", "DELETE", "TRUNCATE"} {
		if lo.ContainsBy(events, func(e string) bool { return ddl.TriggerEvent(e) == event }) {
			result = append(result, event)
		}
	}

	return result
}

func createTriggerStatement(tableRef string, trigger *dto.PostgresTableTriggerData) (string, error) {
	name := lo.FromPtr(trigger.Name)
	timing := ddl.TriggerTiming(lo.FromPtr(trigger.Timing))
	events := triggerEvents(trigger.Events)
	function := qualifiedFunction(lo.FromPtr(trigger.Function))

	switch {
	case name == "":
		return "", fmt.Errorf("trigger needs a name")
	case timing == "":
		return "", fmt.Errorf("trigger %q: timing must be BEFORE, AFTER or INSTEAD OF", name)
	case len(events) == 0:
		return "", fmt.Errorf("trigger %q: pick at least one event (INSERT, UPDATE, DELETE, TRUNCATE)", name)
	case function == "":
		return "", fmt.Errorf("trigger %q: pick the function to execute", name)
	}

	query := "CREATE TRIGGER " + quote.PostgresIdent(name) + " " + timing + " " + strings.Join(events, " OR ") +
		" ON " + tableRef + " FOR EACH " + orientationOrDefault(trigger.Orientation)

	if raw := lo.FromPtr(trigger.When); strings.TrimSpace(raw) != "" {
		when := ddl.SQLExpression(raw)
		if when == "" {
			return "", fmt.Errorf("trigger %q: WHEN must be a single SQL expression without ';' or comments", name)
		}

		query += " WHEN (" + when + ")"
	}

	return query + " EXECUTE FUNCTION " + function + "()", nil
}

// qualifiedFunction quotes a "schema.function" option value.
func qualifiedFunction(value string) string {
	schema, name, ok := strings.Cut(value, ".")
	if !ok || schema == "" || name == "" {
		return ""
	}

	return quote.PostgresQualifiedTable(schema, name)
}
