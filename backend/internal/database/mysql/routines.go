package databaseMysql

import (
	"context"

	"github.com/samber/lo"
)

type Routine struct {
	Name          string `gorm:"column:ROUTINE_NAME"`
	Returns       string `gorm:"column:RETURNS"`
	Body          string `gorm:"column:ROUTINE_DEFINITION"`
	Deterministic bool   `gorm:"column:DETERMINISTIC"`
	Comment       string `gorm:"column:ROUTINE_COMMENT"`
	Parameters    string `gorm:"column:PARAMETERS"`
}

// routines lists the stored functions or procedures of a database. Parameters
// is rebuilt as the SQL parameter list the form edits.
func (r *MySQLRepository) routines(ctx context.Context, database string, procedure bool) ([]Routine, error) {
	var results []Routine

	err := r.base.DB().WithContext(ctx).Raw(`
		SELECT
			r.ROUTINE_NAME,
			COALESCE(r.DTD_IDENTIFIER, '') AS RETURNS,
			r.ROUTINE_DEFINITION,
			r.IS_DETERMINISTIC = 'YES' AS DETERMINISTIC,
			r.ROUTINE_COMMENT,
			COALESCE((
				SELECT GROUP_CONCAT(
					CONCAT(COALESCE(CONCAT(p.PARAMETER_MODE, ' '), ''), p.PARAMETER_NAME, ' ', p.DTD_IDENTIFIER)
					ORDER BY p.ORDINAL_POSITION SEPARATOR ', ')
				FROM information_schema.PARAMETERS p
				WHERE p.SPECIFIC_SCHEMA = r.ROUTINE_SCHEMA AND p.SPECIFIC_NAME = r.SPECIFIC_NAME
					AND p.ROUTINE_TYPE = r.ROUTINE_TYPE AND p.ORDINAL_POSITION > 0
			), '') AS PARAMETERS
		FROM information_schema.ROUTINES r
		WHERE r.ROUTINE_SCHEMA = ? AND r.ROUTINE_TYPE = ?
		ORDER BY r.ROUTINE_NAME
	`, database, lo.Ternary(procedure, "PROCEDURE", "FUNCTION")).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	return results, nil
}
