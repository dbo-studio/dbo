package pgsqlDriver

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

func queryGenerator(dto *dto.RunQueryDto) string {
	var sb strings.Builder

	// SELECT clause
	selectColumns := "*"
	if len(dto.Columns) > 0 {
		selectColumns = strings.Join(dto.Columns, ", ")
	}
	_, _ = fmt.Fprintf(&sb, "SELECT %s FROM %q", selectColumns, dto.Table)

	// WHERE clause
	if len(dto.Filters) > 0 {
		sb.WriteString(" WHERE ")
		for i, filter := range dto.Filters {
			_, _ = fmt.Fprintf(&sb, "%s %s '%s'", filter.Column, filter.Operator, filter.Value)
			if i < len(dto.Filters)-1 {
				_, _ = fmt.Fprintf(&sb, " %s ", filter.Next)
			}
		}
	}

	// ORDER BY clause
	if len(dto.Sorts) > 0 {
		sb.WriteString(" ORDER BY ")
		sortClauses := make([]string, len(dto.Sorts))
		for i, sort := range dto.Sorts {
			sortClauses[i] = fmt.Sprintf("%s %s", sort.Column, sort.Operator)
		}
		sb.WriteString(strings.Join(sortClauses, ", "))
	}

	// LIMIT and OFFSET
	limit := 100
	if dto.Limit > 0 {
		limit = int(dto.Limit)
	}
	_, _ = fmt.Fprintf(&sb, " LIMIT %d OFFSET %d;", limit, dto.Offset)

	return sb.String()
}

func createDBQuery(dto *dto.CreateDatabaseRequest) string {
	query := fmt.Sprintf("CREATE DATABASE %s ", dto.Name)
	if dto.Template != nil && len(*dto.Template) > 0 {
		query += fmt.Sprintf("WITH TEMPLATE = %s ", *dto.Template)
	}

	if dto.Encoding != nil && len(*dto.Encoding) > 0 {
		query += fmt.Sprintf("ENCODING = %s ", *dto.Encoding)
	}

	if dto.TableSpace != nil && len(*dto.TableSpace) > 0 {
		query += fmt.Sprintf("TABLESPACE = %s ", *dto.TableSpace)
	}

	return query
}

func updateQueryGenerator(dto *dto.UpdateQueryDto) []string {
	if dto == nil || dto.EditedItems == nil {
		return nil // Handle nil DTO or EditedItems gracefully
	}

	var queries []string

	for _, editedItem := range dto.EditedItems {
		if len(editedItem.Values) == 0 || len(editedItem.Conditions) == 0 {
			continue
		}

		var setClauses []string
		for key, value := range editedItem.Values {
			if value == nil {
				setClauses = append(setClauses, fmt.Sprintf(`"%s" = NULL`, key))
			} else if value == "@DEFAULT" {
				setClauses = append(setClauses, fmt.Sprintf(`"%s" = DEFAULT`, key))
			} else {
				setClauses = append(setClauses, fmt.Sprintf(`"%s" = '%v'`, key, value))
			}
		}

		var whereClauses []string
		for key, value := range editedItem.Conditions {
			if value == nil {
				whereClauses = append(whereClauses, fmt.Sprintf(`"%s" IS NULL`, key))
			} else {
				whereClauses = append(whereClauses, fmt.Sprintf(`"%s" = '%v'`, key, value))
			}
		}

		query := fmt.Sprintf(
			`UPDATE "%s"."%s" SET %s WHERE %s`,
			dto.Schema,
			dto.Table,
			strings.Join(setClauses, ", "),
			strings.Join(whereClauses, " AND "),
		)

		queries = append(queries, query)
	}

	return queries
}

func deleteQueryGenerator(dto *dto.UpdateQueryDto) []string {
	if dto == nil || dto.DeletedItems == nil {
		return nil
	}

	var queries []string

	for _, deletedItem := range dto.DeletedItems {
		if len(deletedItem) == 0 {
			continue
		}

		var conditions []string
		for key, value := range deletedItem {
			conditions = append(conditions, fmt.Sprintf(`"%s" = '%v'`, key, value))
		}

		query := fmt.Sprintf(
			`DELETE FROM "%s"."%s" WHERE %s`,
			dto.Schema,
			dto.Table,
			strings.Join(conditions, " AND "),
		)

		queries = append(queries, query)
	}

	return queries
}

func insertQueryGenerator(dto *dto.UpdateQueryDto) []string {
	if dto == nil || dto.AddedItems == nil {
		return nil
	}
	var queries []string

	for _, addedItem := range dto.AddedItems {
		if len(addedItem) == 0 {
			continue
		}

		var columns, values []string

		for key, value := range addedItem {
			if value == "@DEFAULT" {
				continue
			}

			columns = append(columns, fmt.Sprintf(`"%s"`, key))
			if value == nil {
				values = append(values, "NULL")
			} else {
				values = append(values, fmt.Sprintf(`'%v'`, value))
			}
		}

		query := fmt.Sprintf(
			`INSERT INTO "%s"."%s" (%s) VALUES (%s)`,
			dto.Schema,
			dto.Table,
			strings.Join(columns, ", "),
			strings.Join(values, ", "),
		)

		queries = append(queries, query)
	}

	return queries
}

func updateDesignGenerator(dto *dto.UpdateDesignRequest) []string {
	alter := fmt.Sprintf(`ALTER TABLE "%s"."%s" `, dto.Schema, dto.Table)

	queries := make([]string, 0)
	for _, editedItem := range dto.EditedItems {

		if editedItem.Type != nil {
			query := alter
			if editedItem.Length != nil {
				query += fmt.Sprintf(`ALTER COLUMN "%s" SET DATA TYPE %s(%d)`, editedItem.Name, *editedItem.Type, *editedItem.Length)
			} else {
				query += fmt.Sprintf(`ALTER COLUMN "%s" SET DATA TYPE %s`, editedItem.Name, *editedItem.Type)
			}

			queries = append(queries, query)
		}

		if editedItem.IsNull != nil {
			query := alter
			if *editedItem.IsNull {
				query += fmt.Sprintf(`ALTER COLUMN "%s" DROP NOT NULL`, editedItem.Name)
			} else {
				query += fmt.Sprintf(`ALTER COLUMN "%s" SET NOT NULL`, editedItem.Name)
			}
			queries = append(queries, query)
		}

		if editedItem.Rename != nil {
			query := alter + fmt.Sprintf(`RENAME COLUMN "%s" TO "%s"`, editedItem.Name, *editedItem.Rename)
			queries = append(queries, query)
		}

		if editedItem.Default != nil {
			query := alter

			if editedItem.Default.MakeNull != nil && *editedItem.Default.MakeNull {
				query += fmt.Sprintf(`ALTER COLUMN "%s" SET DEFAULT NULL`, editedItem.Name)
			} else if editedItem.Default.MakeEmpty != nil && *editedItem.Default.MakeEmpty {
				query += fmt.Sprintf(`ALTER COLUMN "%s" SET DEFAULT ''`, editedItem.Name)
			} else {
				query += fmt.Sprintf(`ALTER COLUMN "%s" SET DEFAULT '%s'`, editedItem.Name, *editedItem.Default.Value)
			}
			queries = append(queries, query)
		}

		if editedItem.Comment != nil {
			query := fmt.Sprintf(`COMMENT ON COLUMN "%s"."%s"."%s" IS '%s'`, dto.Schema, dto.Table, editedItem.Name, *editedItem.Comment)
			queries = append(queries, query)
		}
	}

	return queries
}

func insertToDesignGenerator(dto *dto.UpdateDesignRequest) []string {
	alter := fmt.Sprintf(`ALTER TABLE "%s"."%s" `, dto.Schema, dto.Table)
	queries := make([]string, 0)
	for _, addedItem := range dto.AddedItems {
		query := alter + fmt.Sprintf(`ADD COLUMN "%s" %s`, addedItem.Name, addedItem.Type)
		if addedItem.Length != nil {
			query += fmt.Sprintf(`(%d)`, *addedItem.Length)
		}

		if addedItem.IsNull != nil && !*addedItem.IsNull {
			query += " NOT NULL"
		}

		if addedItem.Default != nil {
			if addedItem.Default.MakeNull != nil && *addedItem.Default.MakeNull {
				query += " DEFAULT NULL"

			} else if addedItem.Default.MakeEmpty != nil && *addedItem.Default.MakeEmpty {
				query += "DEFAULT ''"
			} else {
				query += fmt.Sprintf(` DEFAULT '%s'`, *addedItem.Default.Value)
			}
		}

		queries = append(queries, query)
		if addedItem.Comment != nil {
			query := fmt.Sprintf(`COMMENT ON COLUMN "%s"."%s"."%s" IS '%s'`, dto.Schema, dto.Table, addedItem.Name, *addedItem.Comment)
			queries = append(queries, query)
		}
	}

	return queries
}

func deleteFromDesignGenerator(dto *dto.UpdateDesignRequest) []string {
	alter := fmt.Sprintf(`ALTER TABLE "%s"."%s" `, dto.Schema, dto.Table)
	queries := make([]string, 0)
	for _, deletedItem := range dto.DeletedItems {
		if deletedItem == "" {
			continue
		}
		query := alter + fmt.Sprintf(`DROP COLUMN "%s"`, deletedItem)
		queries = append(queries, query)
	}

	return queries
}
