package query_handler

import (
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/api/response"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/helper"
	"github.com/gofiber/fiber/v3"
)

type AutoCompleteResult struct {
	Databases []string            `json:"databases"`
	Views     []string            `json:"views"`
	Schemas   []string            `json:"schemas"`
	Tables    []string            `json:"tables"`
	Columns   map[string][]string `json:"columns"`
}

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

	resultFromCache, err := findResultFromCache(req.ConnectionId, req.Database, req.Schema, fromCache)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	if resultFromCache != nil {
		return c.JSON(response.Success(resultFromCache))
	}

	databases, err := app.Drivers().Pgsql.Databases(req.ConnectionId, true)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	views, err := app.Drivers().Pgsql.Views(req.ConnectionId)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	schemas, err := app.Drivers().Pgsql.Schemas(req.ConnectionId, req.Database, true)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	tables, err := app.Drivers().Pgsql.Tables(req.ConnectionId, req.Schema)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	columns, err := getColumns(req.ConnectionId, tables, req.Schema)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	autocomplete := AutoCompleteResult{
		Databases: databases,
		Views:     views,
		Schemas:   schemas,
		Tables:    tables,
		Columns:   columns,
	}

	ttl := 60 * time.Minute
	err = app.Cache().Set(cacheName(req.ConnectionId, req.Database, req.Schema), autocomplete, &ttl)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(autocomplete))
}

func findResultFromCache(connectionID int32, database string, schema string, fromCache bool) (*AutoCompleteResult, error) {
	var result *AutoCompleteResult
	err := app.Cache().ConditionalGet(
		cacheName(connectionID, database, schema),
		&result,
		fromCache,
	)

	if err != nil {
		return nil, err
	}

	return result, nil
}

func getColumns(connectionID int32, tables []string, schema string) (map[string][]string, error) {
	columns := make(map[string][]string)
	for _, ta := range tables {
		columnResult, err := app.Drivers().Pgsql.Columns(connectionID, ta, schema)
		if err != nil {
			return map[string][]string{}, err
		}
		columns[ta] = columnResult
	}

	return columns, nil
}

func cacheName(connectionID int32, database string, schema string) string {
	return fmt.Sprintf("auto_complete_connection_%d_database_%s_schema_%s", connectionID, database, schema)
}
