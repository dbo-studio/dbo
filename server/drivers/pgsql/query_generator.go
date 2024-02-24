package pgsql

import (
	"fmt"
	"strings"

	"github.com/khodemobin/dbo/api/dto"
)

func queryGenerator(dto *dto.RunQueryDto) (string, error) {
	query := ""

	if len(dto.Columns) == 0 {
		query = "Select * "
	} else {
		query = fmt.Sprintf("SELECT %s ", strings.Join(dto.Columns, ","))
	}

	query += fmt.Sprintf("FROM %q ", dto.Table)

	if len(dto.Filters) > 0 {
		query += "WHERE "
		for index, filter := range dto.Filters {
			query += fmt.Sprintf("%q %s %s ", filter.Column, filter.Operator, filter.Value)
			if index != len(dto.Filters)-1 {
				query += fmt.Sprintf("%s ", filter.Next)
			}
		}
	}

	if len(dto.Sorts) > 0 {
		query += "ORDER BY "
		for index, sort := range dto.Sorts {
			query += fmt.Sprintf("%q %s ", sort.Column, sort.Operator)
			if index != len(dto.Sorts)-1 {
				query += ", "
			}
		}
	}

	limit := 100
	if dto.Limit > 0 {
		limit = int(dto.Limit)
	}

	query += fmt.Sprintf("LIMIT %d ", limit)

	query += fmt.Sprintf("OFFSET %d;", dto.Offset)

	return query, nil
}

func createDBQuery(dto *dto.DatabaseDto) string {
	query := fmt.Sprintf("CREATE DATABASE %s ", dto.Name)
	if dto.Template != nil {
		query += fmt.Sprintf("WITH TEMPLATE = %s ", *dto.Template)
	}

	if dto.Encoding != nil {
		query += fmt.Sprintf("ENCODING = %s ", *dto.Encoding)
	}

	if dto.TableSpace != nil {
		query += fmt.Sprintf("TABLESPACE = %s ", *dto.TableSpace)
	}

	return query
}
