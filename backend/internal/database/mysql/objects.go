package databaseMysql

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

func createObject(r *MySQLRepository, params interface{}) error {
	switch p := params.(type) {
	case dto.MySQLCreateDatabaseParams:
		query := fmt.Sprintf("CREATE DATABASE %s", p.Name)
		if p.Charset != "" {
			query += fmt.Sprintf(" CHARACTER SET %s", p.Charset)
		}
		if p.Collation != "" {
			query += fmt.Sprintf(" COLLATE %s", p.Collation)
		}
		return r.db.Exec(query).Error
	case dto.MySQLCreateTableParams:
		query := fmt.Sprintf("CREATE TABLE %s (", p.Name)
		for i, col := range p.Columns {
			colDef := fmt.Sprintf("%s %s", col.Name, col.DataType)
			if col.NotNull {
				colDef += " NOT NULL"
			}
			if col.Primary {
				colDef += " PRIMARY KEY"
			}
			if col.Default != "" {
				colDef += fmt.Sprintf(" DEFAULT '%s'", col.Default)
			}
			if i < len(p.Columns)-1 {
				colDef += ", "
			}
			query += colDef
		}
		query += ")"
		if p.Engine != "" {
			query += fmt.Sprintf(" ENGINE=%s", p.Engine)
		}
		return r.db.Exec(query).Error
	case dto.MySQLCreateObjectParams:
		switch p.Type {
		case "schema":
			return r.CreateObject(dto.MySQLCreateDatabaseParams{
				Name:      p.Name,
				Charset:   p.Charset,
				Collation: p.Collation,
			})
		case "view":
			query := "CREATE "
			if p.OrReplace {
				query += "OR REPLACE "
			}
			query += fmt.Sprintf("VIEW %s AS %s", p.Name, p.Query)
			return r.db.Exec(query).Error
		case "index":
			query := fmt.Sprintf("CREATE INDEX %s ON %s (%s)", p.Name, p.TableName, strings.Join(p.Columns, ", "))
			return r.db.Exec(query).Error
		default:
			return fmt.Errorf("MySQL: unsupported object type: %s", p.Type)
		}
	default:
		return fmt.Errorf("MySQL: invalid params for CreateObject")
	}
}

func dropObject(r *MySQLRepository, params interface{}) error {
	switch p := params.(type) {
	case dto.MySQLDropDatabaseParams:
		query := "DROP DATABASE "
		if p.IfExists {
			query += "IF EXISTS "
		}
		query += p.Name
		return r.db.Exec(query).Error
	case dto.DropTableParams:
		query := "DROP TABLE "
		if p.IfExists {
			query += "IF EXISTS "
		}
		query += p.Name
		return r.db.Exec(query).Error
	case dto.DropObjectParams:
		query := fmt.Sprintf("DROP %s ", strings.ToUpper(p.Type))
		if p.IfExists {
			query += "IF EXISTS "
		}
		query += p.Name
		return r.db.Exec(query).Error
	default:
		return fmt.Errorf("MySQL: invalid params for DropObject")
	}
}

func updateObject(r *MySQLRepository, params interface{}) error {
	switch p := params.(type) {
	case dto.MySQLUpdateTableParams:
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
					query += fmt.Sprintf(" DEFAULT '%s'", col.Default)
				}
				if err := r.db.Exec(query).Error; err != nil {
					return err
				}
			}
		}
		if p.Engine != "" {
			query := fmt.Sprintf("ALTER TABLE %s ENGINE = %s", p.OldName, p.Engine)
			return r.db.Exec(query).Error
		}
		return nil
	case dto.MySQLUpdateObjectParams:
		switch p.Type {
		case "view":
			query := "CREATE "
			if p.OrReplace {
				query += "OR REPLACE "
			}
			query += fmt.Sprintf("VIEW %s AS %s", p.Name, p.Query)
			return r.db.Exec(query).Error
		case "index":
			query := fmt.Sprintf("DROP INDEX %s ON %s; CREATE INDEX %s ON %s (%s)", p.Name, p.TableName, p.Name, p.TableName, strings.Join(p.Columns, ", "))
			return r.db.Exec(query).Error
		default:
			return fmt.Errorf("MySQL: unsupported object type for update: %s", p.Type)
		}
	default:
		return fmt.Errorf("MySQL: invalid params for UpdateObject")
	}
}

func getObjectData(r *MySQLRepository, nodeID, objType string) (interface{}, error) {
	switch objType {
	case "table":
		var columns []struct {
			Field   string `gorm:"column:Field"`
			Type    string `gorm:"column:Type"`
			Null    string `gorm:"column:Null"`
			Key     string `gorm:"column:Key"`
			Default string `gorm:"column:Default"`
		}
		err := r.db.Raw(fmt.Sprintf("SHOW COLUMNS FROM %s", nodeID)).Scan(&columns).Error
		if err != nil {
			return nil, err
		}
		tableColumns := make([]dto.ColumnDefinition, len(columns))
		for i, col := range columns {
			tableColumns[i] = dto.ColumnDefinition{
				Name:     col.Field,
				DataType: col.Type,
				NotNull:  col.Null == "NO",
				Primary:  col.Key == "PRI",
				Default:  col.Default,
			}
		}
		return dto.MySQLCreateTableParams{Name: nodeID, Columns: tableColumns, Engine: "InnoDB"}, nil
	case "view":
		var query string
		err := r.db.Raw("SELECT view_definition FROM information_schema.views WHERE table_name = ? AND table_schema = DATABASE()", nodeID).Scan(&query).Error
		if err != nil {
			return nil, err
		}
		return dto.MySQLCreateObjectParams{Name: nodeID, Type: "view", Query: query, OrReplace: false}, nil
	case "index":
		var tableName string
		var columns []string
		err := r.db.Raw(`
            SELECT TABLE_NAME, GROUP_CONCAT(COLUMN_NAME) AS columns 
            FROM information_schema.statistics 
            WHERE INDEX_NAME = ? AND TABLE_SCHEMA = DATABASE()
            GROUP BY TABLE_NAME
        `, nodeID).Scan(&struct {
			TableName string `gorm:"column:TABLE_NAME"`
			Columns   string `gorm:"column:columns"`
		}{TableName: tableName, Columns: strings.Join(columns, ", ")}).Error
		if err != nil {
			return nil, err
		}
		return dto.MySQLCreateObjectParams{Name: nodeID, Type: "index", TableName: tableName, Columns: columns}, nil
	default:
		return nil, fmt.Errorf("MySQL: unsupported object type: %s", objType)
	}
}
