package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

func getObjectData(r *PostgresRepository, nodeID, objType string) (interface{}, error) {
	switch objType {
	case "table":
		var columns []struct {
			Name       string `gorm:"column:column_name"`
			DataType   string `gorm:"column:data_type"`
			IsNullable string `gorm:"column:is_nullable"`
			DefaultVal string `gorm:"column:column_default"`
		}
		err := r.db.Raw("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = ?", nodeID).Scan(&columns).Error
		if err != nil {
			return nil, err
		}
		tableColumns := make([]dto.ColumnDefinition, len(columns))
		for i, col := range columns {
			tableColumns[i] = dto.ColumnDefinition{
				Name:     col.Name,
				DataType: col.DataType,
				NotNull:  col.IsNullable == "NO",
				Default:  col.DefaultVal,
			}
		}
		return dto.PostgresCreateTableParams{Name: nodeID, Columns: tableColumns}, nil

	case "view":
		var query string
		err := r.db.Raw("SELECT definition FROM pg_views WHERE viewname = ?", nodeID).Scan(&query).Error
		if err != nil {
			return nil, err
		}
		return dto.PostgresCreateObjectParams{Name: nodeID, Type: "view", Query: query, OrReplace: false}, nil

	case "materialized_view":
		var query string
		err := r.db.Raw("SELECT definition FROM pg_matviews WHERE matviewname = ?", nodeID).Scan(&query).Error
		if err != nil {
			return nil, err
		}
		var withData bool
		err = r.db.Raw("SELECT populated FROM pg_matviews WHERE matviewname = ?", nodeID).Scan(&withData).Error
		if err != nil {
			return nil, err
		}
		return dto.PostgresCreateObjectParams{Name: nodeID, Type: "materialized_view", Query: query, OrReplace: false, WithData: withData}, nil

	case "index":
		var tableName string
		var columns []string
		err := r.db.Raw(`
            SELECT t.relname AS table_name, STRING_AGG(a.attname, ', ') AS columns
            FROM pg_class c
            JOIN pg_index i ON i.indexrelid = c.oid
            JOIN pg_class t ON i.indrelid = t.oid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
            WHERE c.relname = ?
            GROUP BY t.relname`, nodeID).Scan(&struct {
			TableName *string `gorm:"column:table_name"`
			Columns   string  `gorm:"column:columns"`
		}{TableName: &tableName, Columns: strings.Join(columns, ", ")}).Error
		if err != nil {
			return nil, err
		}
		return dto.PostgresCreateObjectParams{Name: nodeID, Type: "index", TableName: tableName, Columns: columns}, nil

	case "sequence":
		var minValue, maxValue, startValue, increment int64
		err := r.db.Raw("SELECT min_value, max_value, start_value, increment_by FROM pg_sequences WHERE sequencename = ?", nodeID).Scan(&struct {
			MinValue   int64 `gorm:"column:min_value"`
			MaxValue   int64 `gorm:"column:max_value"`
			StartValue int64 `gorm:"column:start_value"`
			Increment  int64 `gorm:"column:increment_by"`
		}{MinValue: minValue, MaxValue: maxValue, StartValue: startValue, Increment: increment}).Error
		if err != nil {
			return nil, err
		}
		return dto.PostgresCreateObjectParams{Name: nodeID, Type: "sequence"}, nil // اطلاعات بیشتر می‌تونی به Struct اضافه کنی

	default:
		return nil, fmt.Errorf("PostgreSQL: unsupported object type: %s", objType)
	}
}

func createObject(r *PostgresRepository, params interface{}) error {
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

func dropObject(r *PostgresRepository, params interface{}) error {
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

func updateObject(r *PostgresRepository, params interface{}) error {
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
		case "materialized_view":
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
