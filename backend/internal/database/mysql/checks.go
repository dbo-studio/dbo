package databaseMysql

import (
	"context"
	"strconv"
	"strings"
)

type TableCheck struct {
	Name       string `gorm:"column:CONSTRAINT_NAME"`
	Expression string `gorm:"column:CHECK_CLAUSE"`
}

// serverVersion reads the raw VERSION() string, e.g. "8.0.36" or "10.11.6-MariaDB".
func (r *MySQLRepository) serverVersion(ctx context.Context) (major, minor, patch int, mariaDB bool) {
	var version string

	if err := r.base.DB().WithContext(ctx).Raw("SELECT VERSION()").Scan(&version).Error; err != nil {
		return 0, 0, 0, false
	}

	mariaDB = strings.Contains(strings.ToLower(version), "mariadb")

	numbers := strings.SplitN(strings.SplitN(version, "-", 2)[0], ".", 3)
	parts := [3]int{}

	for i, number := range numbers {
		parts[i], _ = strconv.Atoi(number)
	}

	return parts[0], parts[1], parts[2], mariaDB
}

// checksSupport reports whether the server enforces CHECK constraints (MySQL
// 8.0.16+, MariaDB 10.2.1+); older servers parse and ignore them.
func (r *MySQLRepository) checksSupport(ctx context.Context) (supported, mariaDB bool) {
	major, minor, patch, mariaDB := r.serverVersion(ctx)

	if mariaDB {
		return major > 10 || (major == 10 && (minor > 2 || (minor == 2 && patch >= 1))), true
	}

	return major > 8 || (major == 8 && (minor > 0 || patch >= 16)), false
}

func (r *MySQLRepository) tableChecks(ctx context.Context, database, table string) ([]TableCheck, error) {
	var results []TableCheck

	err := r.base.DB().WithContext(ctx).Raw(`
		SELECT cc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
		FROM information_schema.TABLE_CONSTRAINTS tc
		JOIN information_schema.CHECK_CONSTRAINTS cc
			ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
		WHERE tc.TABLE_SCHEMA = ? AND tc.TABLE_NAME = ? AND tc.CONSTRAINT_TYPE = 'CHECK'
		ORDER BY cc.CONSTRAINT_NAME
	`, database, table).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	return results, nil
}
