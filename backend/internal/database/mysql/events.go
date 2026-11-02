package databaseMysql

import (
	"context"
	"fmt"
)

type Event struct {
	Name     string `gorm:"column:EVENT_NAME"`
	Schedule string `gorm:"column:SCHEDULE"`
	Status   string `gorm:"column:STATUS"`
	Preserve bool   `gorm:"column:PRESERVE"`
	Comment  string `gorm:"column:EVENT_COMMENT"`
	Body     string `gorm:"column:EVENT_DEFINITION"`
}

// events lists the scheduled events of a database. Schedule is rebuilt as the
// SQL text the form edits: "EVERY n UNIT [STARTS ..] [ENDS ..]" or "AT '..'".
func (r *MySQLRepository) events(ctx context.Context, database string) ([]Event, error) {
	var results []Event

	err := r.base.DB().WithContext(ctx).Raw(`
		SELECT
			EVENT_NAME,
			CASE WHEN EVENT_TYPE = 'ONE TIME'
				THEN CONCAT('AT ''', DATE_FORMAT(EXECUTE_AT, '%Y-%m-%d %H:%i:%s'), '''')
				ELSE CONCAT('EVERY ', INTERVAL_VALUE, ' ', INTERVAL_FIELD,
					IF(STARTS IS NULL, '', CONCAT(' STARTS ''', DATE_FORMAT(STARTS, '%Y-%m-%d %H:%i:%s'), '''')),
					IF(ENDS IS NULL, '', CONCAT(' ENDS ''', DATE_FORMAT(ENDS, '%Y-%m-%d %H:%i:%s'), '''')))
			END AS SCHEDULE,
			CASE STATUS WHEN 'ENABLED' THEN 'ENABLE' WHEN 'DISABLED' THEN 'DISABLE' ELSE 'DISABLE ON SLAVE' END AS STATUS,
			ON_COMPLETION = 'PRESERVE' AS PRESERVE,
			EVENT_COMMENT,
			EVENT_DEFINITION
		FROM information_schema.EVENTS
		WHERE EVENT_SCHEMA = ?
		ORDER BY EVENT_NAME
	`, database).Scan(&results).Error
	if err != nil {
		return nil, fmt.Errorf("list events: %w", err)
	}

	return results, nil
}
