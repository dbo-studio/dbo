package databaseSqlite

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

func createObject(r *SQLiteRepository, params interface{}) error {
	switch p := params.(type) {
	case dto.SQLiteCreateTableParams:
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
		return r.db.Exec(query).Error
	case dto.SQLiteCreateObjectParams:
		switch p.Type {
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
			return fmt.Errorf("SQLite: unsupported object type: %s", p.Type)
		}
	default:
		return fmt.Errorf("SQLite: invalid params for CreateObject")
	}
}

func dropObject(r *SQLiteRepository, params interface{}) error {
	switch p := params.(type) {
	case dto.DropTableParams:
		query := "DROP TABLE "
		if p.IfExists {
			query += "IF EXISTS "
		}
		query += p.Name
		return r.db.Exec(query).Error
	case dto.DropObjectParams:
		switch p.Type {
		case "view", "index":
			query := fmt.Sprintf("DROP %s ", strings.ToUpper(p.Type))
			if p.IfExists {
				query += "IF EXISTS "
			}
			query += p.Name
			return r.db.Exec(query).Error
		default:
			return fmt.Errorf("SQLite: unsupported object type for drop: %s", p.Type)
		}
	default:
		return fmt.Errorf("SQLite: invalid params for DropObject")
	}
}

func updateObject(r *SQLiteRepository, params interface{}) error {
	switch p := params.(type) {
	case dto.SQLiteUpdateTableParams:
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
				if col.Default != "" {
					query += fmt.Sprintf(" DEFAULT '%s'", col.Default)
				}
				if err := r.db.Exec(query).Error; err != nil {
					return err
				}
			}
		}
		return nil
	case dto.SQLiteUpdateObjectParams:
		switch p.Type {
		case "view":
			query := "CREATE "
			if p.OrReplace {
				query += "OR REPLACE "
			}
			query += fmt.Sprintf("VIEW %s AS %s", p.Name, p.Query)
			return r.db.Exec(query).Error
		case "index":
			query := fmt.Sprintf("DROP INDEX IF EXISTS %s; CREATE INDEX %s ON %s (%s)", p.Name, p.Name, p.TableName, strings.Join(p.Columns, ", "))
			return r.db.Exec(query).Error
		default:
			return fmt.Errorf("SQLite: unsupported object type for update: %s", p.Type)
		}
	default:
		return fmt.Errorf("SQLite: invalid params for UpdateObject")
	}
}

func getObjectData(r *SQLiteRepository, nodeID, objType string) (interface{}, error) {
	switch objType {
	case "table":
		var columns []struct {
			Name       string `gorm:"column:name"`
			DataType   string `gorm:"column:type"`
			NotNull    int    `gorm:"column:notnull"`
			PrimaryKey int    `gorm:"column:pk"`
			DefaultVal string `gorm:"column:dflt_value"`
		}
		err := r.db.Raw("PRAGMA table_info(?)", nodeID).Scan(&columns).Error
		if err != nil {
			return nil, err
		}
		tableColumns := make([]databaseContract.ColumnDefinition, len(columns))
		for i, col := range columns {
			tableColumns[i] = databaseContract.ColumnDefinition{
				Name:     col.Name,
				DataType: col.DataType,
				NotNull:  col.NotNull == 1,
				Primary:  col.PrimaryKey == 1,
				Default:  col.DefaultVal,
			}
		}
		return dto.SQLiteCreateTableParams{Name: nodeID, Columns: tableColumns}, nil
	case "view":
		var query string
		err := r.db.Raw("SELECT sql FROM sqlite_master WHERE type='view' AND name=?", nodeID).Scan(&query).Error
		if err != nil {
			return nil, err
		}
		return dto.SQLiteCreateObjectParams{Name: nodeID, Type: "view", Query: query, OrReplace: false}, nil
	case "index":
		var tableName string
		var columns []string
		err := r.db.Raw("SELECT tbl_name FROM sqlite_master WHERE type='index' AND name=?", nodeID).Scan(&tableName).Error
		if err != nil {
			return nil, err
		}
		err = r.db.Raw("PRAGMA index_info(?)", nodeID).Scan(&struct {
			Columns []string `gorm:"column:name"`
		}{Columns: columns}).Error
		if err != nil {
			return nil, err
		}
		return dto.SQLiteCreateObjectParams{Name: nodeID, Type: "index", TableName: tableName, Columns: columns}, nil
	default:
		return nil, fmt.Errorf("SQLite: unsupported object type: %s", objType)
	}
}
