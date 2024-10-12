package query_handler

import (
	"fmt"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/app/response"
	"github.com/dbo-studio/dbo/pkg/helper"
	"time"

	"github.com/gofiber/fiber/v3"
)

type AutoCompleteResult struct {
	Databases []string            `json:"databases"`
	Views     []string            `json:"views"`
	Schemas   []string            `json:"schemas"`
	Tables    []string            `json:"tables"`
	Columns   map[string][]string `json:"columns"`
}

func (h QueryHandler) Autocomplete(c fiber.Ctx) error {
	req := new(dto.AutoCompleteDto)
	if err := c.Bind().Query(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	fromCache := req.FromCache

	resultFromCache, err := h.findResultFromCache(req.ConnectionId, req.Database, req.Schema, fromCache)
	if err != nil {
		h.logger.Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	if resultFromCache != nil {
		return c.JSON(response.Success(resultFromCache))
	}

	databases, err := h.drivers.Pgsql.Databases(req.ConnectionId, true)
	if err != nil {
		h.logger.Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	views, err := h.drivers.Pgsql.Views(req.ConnectionId)
	if err != nil {
		h.logger.Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	schemas, err := h.drivers.Pgsql.Schemas(req.ConnectionId, req.Database, true)
	if err != nil {
		h.logger.Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	tables, err := h.drivers.Pgsql.Tables(req.ConnectionId, req.Schema)
	if err != nil {
		h.logger.Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	columns, err := h.getColumns(req.ConnectionId, tables, req.Schema)
	if err != nil {
		h.logger.Error(err.Error())
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
	err = h.cache.Set(cacheName(req.ConnectionId, req.Database, req.Schema), autocomplete, &ttl)
	if err != nil {
		h.logger.Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(autocomplete))
}

func (h QueryHandler) findResultFromCache(connectionID int32, database string, schema string, fromCache bool) (*AutoCompleteResult, error) {
	var result *AutoCompleteResult
	err := h.cache.ConditionalGet(
		cacheName(connectionID, database, schema),
		&result,
		fromCache,
	)

	if err != nil {
		return nil, err
	}

	return result, nil
}

func (h QueryHandler) getColumns(connectionID int32, tables []string, schema string) (map[string][]string, error) {
	columns := make(map[string][]string)
	for _, ta := range tables {
		columnResult, err := h.drivers.Pgsql.Columns(connectionID, ta, schema)
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
