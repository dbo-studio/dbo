package ddlMysql

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

var eventSchedulePattern = regexp.MustCompile(`(?i)^(EVERY|AT)\s+\S`)

// EventInput plans a MySQL scheduled event.
type EventInput struct {
	Database string
	Old      *dto.EventData
	New      *dto.EventData
}

func eventStatus(value *string) string {
	switch strings.ToUpper(strings.Join(strings.Fields(lo.FromPtr(value)), " ")) {
	case "ENABLE", "ENABLED":
		return "ENABLE"
	case "DISABLE", "DISABLED":
		return "DISABLE"
	case "DISABLE ON SLAVE", "SLAVESIDE_DISABLED":
		return "DISABLE ON SLAVE"
	default:
		return ""
	}
}

func eventSchedule(event *dto.EventData) (string, error) {
	schedule := ddl.SQLExpression(lo.FromPtr(event.Schedule))
	if schedule == "" || !eventSchedulePattern.MatchString(schedule) {
		return "", fmt.Errorf("event %q: schedule must start with EVERY or AT and have no ';' or comments", lo.FromPtr(event.Name))
	}

	return schedule, nil
}

func eventBody(event *dto.EventData) (string, error) {
	body := strings.TrimSpace(lo.FromPtr(event.Body))
	if body == "" {
		return "", fmt.Errorf("event %q: body is required", lo.FromPtr(event.Name))
	}

	return body, nil
}

// BuildEventCreate plans CREATE EVENT.
func BuildEventCreate(input EventInput) ([]ddl.Statement, error) {
	event := input.New
	if event == nil || lo.FromPtr(event.Name) == "" {
		return nil, fmt.Errorf("event needs a name")
	}

	schedule, err := eventSchedule(event)
	if err != nil {
		return nil, err
	}

	body, err := eventBody(event)
	if err != nil {
		return nil, err
	}

	query := "CREATE EVENT " + quote.MysqlQualifiedTable(input.Database, *event.Name) + " ON SCHEDULE " + schedule

	if lo.FromPtr(event.Preserve) {
		query += " ON COMPLETION PRESERVE"
	}

	if status := eventStatus(event.Status); status != "" {
		query += " " + status
	}

	if comment := lo.FromPtr(event.Comment); comment != "" {
		query += " COMMENT " + quote.MysqlLiteral(comment)
	}

	return []ddl.Statement{{SQL: query + " DO " + body, Phase: ddl.PhaseRoutines}}, nil
}

// BuildEventEdit plans a single ALTER EVENT with only the changed clauses.
func BuildEventEdit(input EventInput) ([]ddl.Statement, error) {
	oldEvent, event := input.Old, input.New
	if oldEvent == nil || lo.FromPtr(oldEvent.Name) == "" || event == nil {
		return nil, fmt.Errorf("missing event name")
	}

	var clauses []string

	if lo.FromPtr(event.Schedule) != lo.FromPtr(oldEvent.Schedule) {
		schedule, err := eventSchedule(event)
		if err != nil {
			return nil, err
		}

		clauses = append(clauses, "ON SCHEDULE "+schedule)
	}

	if newName := lo.FromPtr(event.Name); newName == "" {
		return nil, fmt.Errorf("event needs a name")
	} else if newName != *oldEvent.Name {
		clauses = append(clauses, "RENAME TO "+quote.MysqlQualifiedTable(input.Database, newName))
	}

	if lo.FromPtr(event.Preserve) != lo.FromPtr(oldEvent.Preserve) {
		clauses = append(clauses, lo.Ternary(lo.FromPtr(event.Preserve), "ON COMPLETION PRESERVE", "ON COMPLETION NOT PRESERVE"))
	}

	if status := eventStatus(event.Status); status != "" && status != eventStatus(oldEvent.Status) {
		clauses = append(clauses, status)
	}

	if lo.FromPtr(event.Comment) != lo.FromPtr(oldEvent.Comment) {
		clauses = append(clauses, "COMMENT "+quote.MysqlLiteral(lo.FromPtr(event.Comment)))
	}

	if strings.TrimSpace(lo.FromPtr(event.Body)) != strings.TrimSpace(lo.FromPtr(oldEvent.Body)) {
		body, err := eventBody(event)
		if err != nil {
			return nil, err
		}

		clauses = append(clauses, "DO "+body)
	}

	if len(clauses) == 0 {
		return nil, nil
	}

	query := "ALTER EVENT " + quote.MysqlQualifiedTable(input.Database, *oldEvent.Name) + " " + strings.Join(clauses, " ")

	return []ddl.Statement{{SQL: query, Phase: ddl.PhaseRoutines}}, nil
}

func BuildEventDrop(database, name string) ddl.Statement {
	return ddl.Statement{SQL: "DROP EVENT " + quote.MysqlQualifiedTable(database, name), Phase: ddl.PhaseRoutines}
}
