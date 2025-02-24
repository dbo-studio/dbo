package databaseSqlserver

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

func createObject(r *SQLServerRepository, params interface{}) error {
	switch p := params.(type) {
	case dto.SQLServerCreateDatabaseParams:
		query := fmt.Sprintf("CREATE DATABASE %s", p.Name)
		return r.db.Exec(query).Error
	case dto.SQLServerCreateTableParams:
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
	case dto.SQLServerCreateObjectParams:
		switch p.Type {
		case "view":
			query := "CREATE "
			if p.OrReplace {
				query = "ALTER "
			}
			query += fmt.Sprintf("VIEW %s AS %s", p.Name, p.Query)
			return r.db.Exec(query).Error
		case "index":
			query := fmt.Sprintf("CREATE INDEX %s ON %s (%s)", p.Name, p.TableName, strings.Join(p.Columns, ", "))
			return r.db.Exec(query).Error
		default:
			return fmt.Errorf("SQLServer: unsupported object type: %s", p.Type)
		}
	default:
		return fmt.Errorf("SQLServer: invalid params for CreateObject")
	}
}

func dropObject(r *SQLServerRepository, params interface{}) error {
	switch p := params.(type) {
	case dto.SQLServerDropDatabaseParams:
		query := fmt.Sprintf("DROP DATABASE %s", p.Name)
		return r.db.Exec(query).Error
	case dto.DropTableParams:
		query := fmt.Sprintf("DROP TABLE %s", p.Name)
		return r.db.Exec(query).Error
	case dto.DropObjectParams:
		query := fmt.Sprintf("DROP %s %s", strings.ToUpper(p.Type), p.Name)
		return r.db.Exec(query).Error
	default:
		return fmt.Errorf("SQLServer: invalid params for DropObject")
	}
}

func updateObject(r *SQLServerRepository, params interface{}) error {
	switch p := params.(type) {
	case dto.SQLServerUpdateTableParams:
		if p.NewName != "" && p.NewName != p.OldName {
			query := fmt.Sprintf("EXEC sp_rename '%s', '%s'", p.OldName, p.NewName)
			if err := r.db.Exec(query).Error; err != nil {
				return err
			}
		}
		if len(p.AddColumns) > 0 {
			for _, col := range p.AddColumns {
				query := fmt.Sprintf("ALTER TABLE %s ADD %s %s", p.OldName, col.Name, col.DataType)
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
	case dto.SQLServerUpdateObjectParams:
		switch p.Type {
		case "view":
			query := "CREATE "
			if p.OrReplace {
				query = "ALTER "
			}
			query += fmt.Sprintf("VIEW %s AS %s", p.Name, p.Query)
			return r.db.Exec(query).Error
		case "index":
			query := fmt.Sprintf("DROP INDEX %s ON %s; CREATE INDEX %s ON %s (%s)", p.Name, p.TableName, p.Name, p.TableName, strings.Join(p.Columns, ", "))
			return r.db.Exec(query).Error
		default:
			return fmt.Errorf("SQLServer: unsupported object type for update: %s", p.Type)
		}
	default:
		return fmt.Errorf("SQLServer: invalid params for UpdateObject")
	}
}

func getObjectData(r *SQLServerRepository, nodeID, objType string) (interface{}, error) {
	switch objType {
	case "table":
		var columns []struct {
			Name       string `gorm:"column:COLUMN_NAME"`
			DataType   string `gorm:"column:DATA_TYPE"`
			IsNullable string `gorm:"column:IS_NULLABLE"`
			Default    string `gorm:"column:COLUMN_DEFAULT"`
		}
		err := r.db.Raw(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = ? AND TABLE_SCHEMA = 'dbo'
        `, nodeID).Scan(&columns).Error
		if err != nil {
			return nil, err
		}
		tableColumns := make([]databaseContract.ColumnDefinition, len(columns))
		for i, col := range columns {
			tableColumns[i] = databaseContract.ColumnDefinition{
				Name:     col.Name,
				DataType: col.DataType,
				NotNull:  col.IsNullable == "NO",
				Default:  col.Default,
			}
		}
		return dto.SQLServerCreateTableParams{Name: nodeID, Columns: tableColumns}, nil
	case "view":
		var query string
		err := r.db.Raw(`
            SELECT DEFINITION 
            FROM INFORMATION_SCHEMA.VIEWS 
            WHERE TABLE_NAME = ? AND TABLE_SCHEMA = 'dbo'
        `, nodeID).Scan(&query).Error
		if err != nil {
			return nil, err
		}
		return dto.SQLServerCreateObjectParams{Name: nodeID, Type: "view", Query: query, OrReplace: false}, nil
	case "index":
		var tableName string
		var columns []string
		err := r.db.Raw(`
            SELECT OBJECT_NAME(i.object_id) AS table_name, STRING_AGG(c.name, ', ') AS columns
            FROM sys.indexes i
            JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            WHERE i.name = ? AND i.is_primary_key = 0
            GROUP BY i.object_id
        `, nodeID).Scan(&struct {
			TableName string `gorm:"column:table_name"`
			Columns   string `gorm:"column:columns"`
		}{TableName: tableName, Columns: strings.Join(columns, ", ")}).Error
		if err != nil {
			return nil, err
		}
		return dto.SQLServerCreateObjectParams{Name: nodeID, Type: "index", TableName: tableName, Columns: columns}, nil
	default:
		return nil, fmt.Errorf("SQLServer: unsupported object type: %s", objType)
	}
}
