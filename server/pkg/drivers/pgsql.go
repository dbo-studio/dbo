package drivers

import (
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/internal/model"
	"github.com/khodemobin/dbo/pkg/types"
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

func ConnectionSchema(connectionId int32) ([]map[string]interface{}, error) {
	db, err := Connect(connectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	query := "SELECT n.nspname AS schema_name,t.tablename AS table_name FROM pg_namespace n LEFT JOIN pg_tables t ON n.nspname=t.schemaname::name WHERE n.nspname NOT LIKE'pg_%' AND n.nspname!='information_schema' ORDER BY schema_name,table_name;"

	var results []map[string]interface{}
	result := db.Raw(query).Scan(&results)

	if result.Error != nil {
		return nil, result.Error
	}

	return results, nil
}
