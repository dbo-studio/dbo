package pgsql

import (
	"fmt"
	"strings"

	"github.com/khodemobin/dbo/api/dto"
)

func queryGenerator(req *dto.RunQueryDto) (string, error) {
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
