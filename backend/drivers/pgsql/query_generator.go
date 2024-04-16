package pgsql_driver

import (
	"fmt"
	"strings"

	"github.com/khodemobin/dbo/api/dto"
)

func (p *PostgresQueryEngine) queryGenerator(dto *dto.RunQueryDto) string {
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
			query += fmt.Sprintf("%q %s '%s' ", filter.Column, filter.Operator, filter.Value)
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

	return query
}

func (p *PostgresQueryEngine) createDBQuery(dto *dto.DatabaseDto) string {
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

func (p *PostgresQueryEngine) updateQueryGenerator(dto *dto.UpdateQueryDto) []string {
	queries := []string{}

	for _, editedItem := range dto.EditedItems {
		if len(editedItem.Values) == 0 || len(editedItem.Conditions) == 0 {
			continue
		}

		query := fmt.Sprintf(`UPDATE "%s"."%s" SET `, dto.Schema, dto.Table)
		for key, value := range editedItem.Values {
			if key == "dbo_index" {
				continue
			}
			query += fmt.Sprintf(`"%s" = '%v', `, key, value)
		}

		query = query[:len(query)-2]

		query += " WHERE "
		for key, value := range editedItem.Conditions {
			query += fmt.Sprintf("%s = '%v' AND ", key, value)
		}

		query = query[:len(query)-5]

		queries = append(queries, query)
	}

	return queries
}

func (p *PostgresQueryEngine) deleteQueryGenerator(dto *dto.UpdateQueryDto) []string {
	queries := []string{}

	for _, deletedItem := range dto.DeletedItems {
		if len(deletedItem) == 0 {
			continue
		}
		query := fmt.Sprintf(`DELETE FROM "%s"."%s" WHERE `, dto.Schema, dto.Table)
		for key, value := range deletedItem {
			if key == "dbo_index" {
				continue
			}
			query += fmt.Sprintf(`"%s" = '%v' AND `, key, value)
		}

		query = query[:len(query)-5]

		queries = append(queries, query)
	}

	return queries
}

func (p *PostgresQueryEngine) insertQueryGenerator(dto *dto.UpdateQueryDto) []string {
	queries := []string{}

	for _, addedItem := range dto.AddedItems {
		if len(addedItem) == 0 {
			continue
		}

		query := fmt.Sprintf(`INSERT INTO "%s"."%s" (`, dto.Schema, dto.Table)
		for key := range addedItem {
			if key == "dbo_index" {
				continue
			}

			query += fmt.Sprintf(`%s, `, key)
		}

		query = query[:len(query)-2] + ") VALUES ("

		for key, value := range addedItem {
			if key == "dbo_index" {
				continue
			}
			query += fmt.Sprintf(`'%v', `, value)
		}

		query = query[:len(query)-2] + ")"

		queries = append(queries, query)
	}

	return queries
}

func (p *PostgresQueryEngine) updateDesignGenerator(dto *dto.DesignDto) []string {
	queries := []string{}

	for _, editedItem := range dto.EditedItems {
		query := fmt.Sprintf(`ALTER TABLE "%s"."%s" `, dto.Schema, dto.Table)
		query += fmt.Sprintf(`ALTER COLUMN "%s"."%s" TYPE %s(%s) COLLATE "pg_catalog"."%s" USING "%s"::%s(%s) `, dto.Schema, dto.Table,editedItem.Type,editedItem.Length,dto.Database,dto.Table,editedItem.Type,editedItem.Length)
		
		if(editedItem.IsNull){
			query += fmt.Sprintf(`ALTER COLUMN "%s"."%s" SET NULL`, dto.Schema, dto.Table,editedItem.Type,editedItem.Length,dto.Database,dto.Table,editedItem.Type,editedItem.Length)
		}else{

		}

		// ALTER TABLE "public"."data_src" 
		// ALTER COLUMN "authors" TYPE varchar(255) COLLATE "pg_catalog"."default" USING "authors"::varchar(255),
		// ALTER COLUMN "authors" SET NOT NULL
		// ALTER TABLE "public"."data_src" RENAME COLUMN "authors" TO "authors_renamed"

		for key, value := range editedItem.Values {
			if key == "dbo_index" {
				continue
			}
			query += fmt.Sprintf(`"%s" = '%v', `, key, value)
		}

		query = query[:len(query)-2]

		query += " WHERE "
		for key, value := range editedItem.Conditions {
			query += fmt.Sprintf("%s = '%v' AND ", key, value)
		}

		query = query[:len(query)-5]

		queries = append(queries, query)
	}

	return queries
}
create table "users" (
	"id" serial primary key,
	"first_name" VARYING CHARACTER not null default fghfgh,
	"last_name" varchar(255) null,
	"email" varchar(255) not null,
	"created_at" timestamp not null default NOW(),
	"updated_at" timestamp not null default NOW()
  );
  comment on column "users"."first_name" is 'vbnvbn'