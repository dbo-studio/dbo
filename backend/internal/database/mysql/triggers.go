package databaseMysql

import "context"

type TableTrigger struct {
	Name   string `gorm:"column:TRIGGER_NAME"`
	Timing string `gorm:"column:ACTION_TIMING"`
	Event  string `gorm:"column:EVENT_MANIPULATION"`
	Body   string `gorm:"column:ACTION_STATEMENT"`
}

func (r *MySQLRepository) tableTriggers(ctx context.Context, database, table string) ([]TableTrigger, error) {
	var results []TableTrigger

	err := r.base.DB().WithContext(ctx).Raw(`
		SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION, ACTION_STATEMENT
		FROM information_schema.TRIGGERS
		WHERE EVENT_OBJECT_SCHEMA = ? AND EVENT_OBJECT_TABLE = ?
		ORDER BY TRIGGER_NAME
	`, database, table).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	return results, nil
}
