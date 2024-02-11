package drivers

import (
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/model"
	"github.com/khodemobin/dbo/types"
	"github.com/samber/lo"
	lop "github.com/samber/lo/parallel"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Connect(connectionId int32) (*gorm.DB, error) {
	var connection model.Connection
	result := app.DB().Where("id", "=", connectionId).First(&connection)
	if result.Error != nil {
		return nil, errors.New("connection not found")
	}

	dsn := fmt.Sprintf("host=%s port=%s dbname=%s user=%s password=%s",
		connection.Host,
		strconv.Itoa(int(connection.Port)),
		connection.Database,
		connection.Username,
		connection.Password.String,
	)

	return gorm.Open(postgres.New(postgres.Config{
		DSN: dsn,
	}), &gorm.Config{})
}

func RunQuery(req *types.RunQueryRequest) ([]map[string]interface{}, error) {
	query, err := queryGenerator(req)
	if err != nil {
		return nil, errors.New("Generate query error: " + err.Error())
	}

	db, err := Connect(req.ConnectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	var results []map[string]interface{}
	result := db.Raw(query).Scan(&results)

	if result.Error != nil {
		return nil, result.Error
	}

	return results, nil
}

func queryGenerator(req *types.RunQueryRequest) (string, error) {
	query := ""

	if len(req.Columns) == 0 {
		query = "Select * "
	} else {
		query = fmt.Sprintf("SELECT %s ", strings.Join(req.Columns, ","))
	}

	query += fmt.Sprintf("FROM %q ", req.Table)

	if len(req.Filters) > 0 {
		query += "WHERE "
		for index, filter := range req.Filters {
			query += fmt.Sprintf("%q %s %s ", filter.Column, filter.Operator, filter.Value)
			if index != len(req.Filters)-1 {
				query += fmt.Sprintf("%s ", filter.Next)
			}
		}
	}

	if len(req.Sorts) > 0 {
		query += "ORDER BY "
		for index, sort := range req.Sorts {
			query += fmt.Sprintf("%q %s ", sort.Column, sort.Operator)
			if index != len(req.Sorts)-1 {
				query += ", "
			}
		}
	}

	limit := 100
	if req.Limit > 0 {
		limit = int(req.Limit)
	}

	query += fmt.Sprintf("LIMIT %d ", limit)

	query += fmt.Sprintf("OFFSET %d;", req.Offset)

	return query, nil
}

func ConnectionSchema(connectionId int32, database string) (*types.ConnectionSchema, error) {
	db, err := Connect(connectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	query := "SELECT n.nspname AS schema_name,t.tablename AS table_name FROM pg_namespace n LEFT JOIN pg_tables t ON n.nspname=t.schemaname::name WHERE n.nspname NOT LIKE'pg_%' AND n.nspname!='information_schema' ORDER BY schema_name,table_name;"

	type Info struct {
		SchemaName string         `gorm:"column:schema_name"`
		TableName  sql.NullString `gorm:"column:table_name"`
	}

	var info []Info
	result := db.Raw(query).Scan(&info)

	if result.Error != nil {
		return nil, result.Error
	}

	var schemes []types.Schema
	for _, item := range info {
		schema, ok := lo.Find(schemes, func(i types.Schema) bool {
			return i.Name == item.SchemaName
		})

		if !ok {
			schema = types.Schema{
				Name:   item.SchemaName,
				Tables: []types.Table{},
			}
			schemes = append(schemes, schema)
			continue
		}

		tables := schema.Tables

		if !item.TableName.Valid {
			continue
		}

		_, ok = lo.Find(tables, func(i types.Table) bool {
			return i.Name == item.TableName.String
		})

		if !ok {
			tables = append(tables, types.Table{
				Name:    item.TableName.String,
				DDL:     "",
				Columns: []types.Column{},
			})
		}

		schemes = lop.Map(schemes, func(i types.Schema, _ int) types.Schema {
			if i.Name == item.SchemaName {
				i.Tables = tables
			}
			return i
		})
	}

	return &types.ConnectionSchema{
		Database: database,
		Schemes:  schemes,
	}, nil
}
