package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

func (r *PostgresRepository) DropObject(params any) error {
	switch p := params.(type) {
	case dto.PostgresDropDatabaseParams:
		query := "DROP DATABASE "
		if p.IfExists {
			query += "IF EXISTS "
		}
		query += p.Name
		if p.Cascade {
			query += " CASCADE"
		}
		return r.db.Exec(query).Error
	case dto.DropTableParams:
		query := "DROP TABLE "
		if p.IfExists {
			query += "IF EXISTS "
		}
		query += p.Name
		if p.Cascade {
			query += " CASCADE"
		}
		return r.db.Exec(query).Error
	case dto.DropObjectParams:
		query := fmt.Sprintf("DROP %s ", strings.ToUpper(p.Type))
		if p.IfExists {
			query += "IF EXISTS "
		}
		query += p.Name
		if p.Cascade {
			query += " CASCADE"
		}
		return r.db.Exec(query).Error
	default:
		return fmt.Errorf("PostgreSQL: invalid params for DropObject")
	}
}
