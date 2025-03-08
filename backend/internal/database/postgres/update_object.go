package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

func (r *PostgresRepository) UpdateObject(params any) error {
	switch p := params.(type) {
	case dto.PostgresUpdateTableParams:
		if p.NewName != "" && p.NewName != p.OldName {
			query := fmt.Sprintf("ALTER TABLE %s RENAME TO %s", p.OldName, p.NewName)
			if err := r.db.Exec(query).Error; err != nil {
				return err
			}
		}
		if len(p.AddColumns) > 0 {
			for _, col := range p.AddColumns {
				query := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", p.OldName, col.Name, col.DataType)
				if col.NotNull {
					query += " NOT NULL"
				}
				if col.Primary {
					query += " PRIMARY KEY"
				}
				if col.Default != "" {
					query += fmt.Sprintf(" DEFAULT %s", col.Default)
				}
				if err := r.db.Exec(query).Error; err != nil {
					return err
				}
			}
		}
		return nil
	case dto.PostgresUpdateObjectParams:
		switch p.Type {
		case "view":
			query := "CREATE "
			if p.OrReplace {
				query += "OR REPLACE "
			}
			query += fmt.Sprintf("VIEW %s AS %s", p.Name, p.Query)
			return r.db.Exec(query).Error
		case "materializedView":
			query := fmt.Sprintf("CREATE MATERIALIZED VIEW %s AS %s", p.Name, p.Query)
			if p.OrReplace {
				query = "DROP MATERIALIZED VIEW IF EXISTS " + p.Name + "; " + query
			}
			if !p.WithData {
				query += " WITH NO DATA"
			}
			return r.db.Exec(query).Error
		case "index":
			query := fmt.Sprintf("DROP INDEX IF EXISTS %s; CREATE INDEX %s ON %s (%s)", p.Name, p.Name, p.TableName, strings.Join(p.Columns, ", "))
			return r.db.Exec(query).Error
		case "sequence":
			query := fmt.Sprintf("ALTER SEQUENCE %s RESTART", p.Name)
			return r.db.Exec(query).Error
		default:
			return fmt.Errorf("PostgreSQL: unsupported object type for update: %s", p.Type)
		}
	default:
		return fmt.Errorf("PostgreSQL: invalid params for UpdateObject")
	}
}
