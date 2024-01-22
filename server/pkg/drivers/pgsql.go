package drivers

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/internal/model"
	"github.com/khodemobin/dbo/pkg/types"
)

func Connect(connectionId int32) (*pgx.Conn, error) {
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

	return pgx.Connect(context.Background(), dsn)
}

func RunQuery(req *types.RunQueryRequest) ([]types.QueryResult, error) {
	query, err := queryGenerator(req)
	if err != nil {
		return nil, errors.New("Generate query error: " + err.Error())
	}

	db, err := Connect(req.ConnectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}
	defer db.Close(context.Background())

	var results []types.QueryResult

	rows, err := db.Query(context.Background(), query)
	if err != nil {
		return nil, errors.New("QueryRow failed: " + err.Error())
	}
	defer rows.Close()

	// Get the column names
	columns := rows.FieldDescriptions()
	if err != nil {
		return nil, errors.New("Get FieldDescriptions: " + err.Error())
	}

	values := make([]interface{}, len(columns))
	for i := range values {
		values[i] = new(interface{})
	}

	for rows.Next() {
		if err := rows.Scan(values...); err != nil {
			return nil, errors.New("Scan: " + err.Error())
		}

		// Create a map to store the result for this row
		rowResult := make(map[string]interface{})

		// Fill the map with column name - value pairs
		for i, column := range columns {
			columnName := string(column.Name)
			rowResult[columnName] = *(values[i].(*interface{}))
		}

		// Append the result to the slice
		results = append(results, rowResult)
	}

	if err := rows.Err(); err != nil {
		return nil, errors.New("Rows: " + err.Error())
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
	defer db.Close(context.Background())

	data, err := db.Query(context.Background(), "SELECT n.nspname AS schema_name,t.tablename AS table_name FROM pg_namespace n LEFT JOIN pg_tables t ON n.nspname=t.schemaname::name WHERE n.nspname NOT LIKE'pg_%' AND n.nspname!='information_schema' ORDER BY schema_name,table_name;").Scan()
	if err != nil {
		return nil, err
	}
	rdata := data["rows"].([]map[string]interface{})
	return rdata, nil
}
