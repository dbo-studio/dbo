package query_handler

import (
	"fmt"
	"github.com/gofiber/fiber/v3"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/helper"
)

func (QueryHandler) Autocomplete(c fiber.Ctx) error {
	req := new(dto.AutoCompleteDto)
	if err := c.Bind().Query(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	fromCache := req.FromCache
	databases, err := getDatabases(req.ConnectionId, fromCache)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}
	if req.Type == "databases" {
		return c.JSON(response.Success(databases))
	}

	views, err := getViews(req.ConnectionId, fromCache)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}
	if req.Type == "views" {
		return c.JSON(response.Success(views))
	}

	schemas, err := getSchemas(req.ConnectionId, databases, req.FromCache)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}
	if req.Type == "schemas" {
		return c.JSON(response.Success(schemas))
	}

	tables, err := getTables(req.ConnectionId, schemas, req.Schema, fromCache)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}
	if req.Type == "tables" {
		return c.JSON(response.Success(tables))
	}

	columns, err := getColumns(req.ConnectionId, tables, req.Schema, req.Table, fromCache)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}
	if req.Type == "columns" {
		return c.JSON(response.Success(columns))
	}

	return nil
}

func getDatabases(connectionID int32, fromCache bool) ([]string, error) {
	var databases []string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("auto_complete_databases_%d", connectionID),
		&databases,
		fromCache,
	)

	if err != nil || databases == nil {
		databases, err = app.Drivers().Pgsql.Databases(connectionID, true)

		if err != nil {
			return databases, err
		}

		err = app.Cache().Set(fmt.Sprintf("auto_complete_databases_%d", connectionID), databases, nil)
		if err != nil {
			return databases, err
		}
	}
	if databases == nil {
		return []string{}, nil
	}

	return databases, err
}

func getViews(connectionID int32, fromCache bool) ([]string, error) {
	var views []string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("auto_complete_views_%d", connectionID),
		&views,
		fromCache,
	)

	if err != nil || views == nil {
		views, err = app.Drivers().Pgsql.Views(connectionID)

		if err != nil {
			return views, err
		}

		err = app.Cache().Set(fmt.Sprintf("auto_complete_views_%d", connectionID), views, nil)
		if err != nil {
			return views, err
		}
	}
	if views == nil {
		return []string{}, nil
	}

	return views, err
}

func getSchemas(connectionID int32, databases []string, fromCache bool) ([]string, error) {
	var schemas []string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("auto_complete_schemas_%d", connectionID),
		&schemas,
		fromCache,
	)

	if err != nil || schemas == nil {
		for _, database := range databases {
			schemaResult, err := app.Drivers().Pgsql.Schemas(connectionID, database)
			if err != nil {
				return []string{}, nil
			}
			schemas = append(schemas, schemaResult...)
		}

		if err != nil {
			return schemas, err
		}

		err = app.Cache().Set(fmt.Sprintf("auto_complete_schemas_%d", connectionID), databases, nil)
		if err != nil {
			return schemas, err
		}
	}

	if schemas == nil {
		return []string{}, nil
	}

	return schemas, nil
}

func getTables(connectionID int32, schemas []string, schema string, fromCache bool) ([]string, error) {
	var tables []string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("auto_complete_tables_%d_%s", connectionID, schema),
		&tables,
		fromCache,
	)

	if err != nil || tables == nil {
		if schema != "" {
			tableResult, err := app.Drivers().Pgsql.Tables(connectionID, schema)
			if err != nil {
				return []string{}, nil
			}
			tables = append(tables, tableResult...)
		} else {
			for _, sc := range schemas {
				tableResult, err := app.Drivers().Pgsql.Tables(connectionID, sc)
				if err != nil {
					return []string{}, nil
				}
				tables = append(tables, tableResult...)
			}
		}

		err = app.Cache().Set(fmt.Sprintf("auto_complete_tables_%d_%s", connectionID, schema), tables, nil)
		if err != nil {
			return schemas, err
		}
	}
	if tables == nil {
		return []string{}, nil
	}

	return tables, nil
}

func getColumns(connectionID int32, tables []string, schema string, table string, fromCache bool) ([]string, error) {
	var columns []string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("auto_complete_columns_%d_%s_%s", connectionID, schema, table),
		&columns,
		fromCache,
	)
	if err != nil || columns == nil {
		if table != "" && schema != "" {
			columnResult, err := app.Drivers().Pgsql.Columns(connectionID, schema, table)
			if err != nil {
				return []string{}, err
			}
			columns = append(columns, columnResult...)
		} else {
			for _, ta := range tables {
				columnResult, err := app.Drivers().Pgsql.Columns(connectionID, schema, ta)
				if err != nil {
					return []string{}, err
				}
				columns = append(columns, columnResult...)
			}
		}

		err = app.Cache().Set(fmt.Sprintf("auto_complete_columns_%d_%s_%s", connectionID, schema, table), columns, nil)
		if err != nil {
			return columns, err
		}
	}

	if columns == nil {
		return []string{}, nil
	}

	return columns, nil
}
