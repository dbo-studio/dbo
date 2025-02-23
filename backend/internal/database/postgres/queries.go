package databasePostgres

import (
	"database/sql"

	"gorm.io/gorm"
)

func executeQuery(r *PostgresRepository, query string, args ...interface{}) (*sql.Rows, error) {
	rows, err := r.db.Raw(query, args...).Rows()
	return rows, err
}

func execute(r *PostgresRepository, query string, args ...interface{}) (*gorm.Statement, error) {
	result := r.db.Exec(query, args...)
	return result.Statement, result.Error
}
