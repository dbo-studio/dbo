package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

func (r *PostgresRepository) CreateObject(params any) error {
	switch p := params.(type) {
	case dto.PostgresCreateDatabaseParams:
		query := fmt.Sprintf("CREATE DATABASE %s", p.Name)
		if p.Owner != "" {
			query += fmt.Sprintf(" OWNER %s", p.Owner)
		}
		if p.Encoding != "" {
			query += fmt.Sprintf(" ENCODING '%s'", p.Encoding)
		}
		if p.Template != "" {
			query += fmt.Sprintf(" TEMPLATE %s", p.Template)
		}
		return r.db.Exec(query).Error
	case dto.PostgresCreateTableParams:
		query := "CREATE "
		if p.Temp {
			query += "TEMPORARY "
		}
		query += fmt.Sprintf("TABLE %s (", p.Name)
		for i, col := range p.Columns {
			colDef := fmt.Sprintf("%s %s", col.Name, col.DataType)
			if col.NotNull {
				colDef += " NOT NULL"
			}
			if col.Primary {
				colDef += " PRIMARY KEY"
			}
			if col.Default != "" {
				colDef += fmt.Sprintf(" DEFAULT %s", col.Default)
			}
			if i < len(p.Columns)-1 {
				colDef += ", "
			}
			query += colDef
		}
		query += ")"
		return r.db.Exec(query).Error
	case dto.PostgresCreateObjectParams:
		switch p.Type {
		case "schema":
			query := fmt.Sprintf("CREATE SCHEMA %s", p.Name)
			if p.Owner != "" {
				query += fmt.Sprintf(" AUTHORIZATION %s", p.Owner)
			}
			return r.db.Exec(query).Error
		case "view":
			query := "CREATE "
			if p.OrReplace {
				query += "OR REPLACE "
			}
			query += fmt.Sprintf("VIEW %s AS %s", p.Name, p.Query)
			return r.db.Exec(query).Error
		case "materialized_view":
			query := fmt.Sprintf("CREATE MATERIALIZED VIEW %s AS %s", p.Name, p.Query)
			if !p.WithData {
				query += " WITH NO DATA"
			}
			return r.db.Exec(query).Error
		case "index":
			query := fmt.Sprintf("CREATE INDEX %s ON %s (%s)", p.Name, p.TableName, strings.Join(p.Columns, ", "))
			return r.db.Exec(query).Error
		case "sequence":
			query := fmt.Sprintf("CREATE SEQUENCE %s", p.Name)
			return r.db.Exec(query).Error
		default:
			return fmt.Errorf("PostgreSQL: unsupported object type: %s", p.Type)
		}
	default:
		return fmt.Errorf("PostgreSQL: invalid params for CreateObject")
	}
}
