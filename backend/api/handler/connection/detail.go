package connection_handler

import (
	"database/sql"
	"fmt"

	"github.com/gofiber/fiber/v3"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/model"
)

func (h *ConnectionHandler) Connection(c fiber.Ctx) error {
	connection, err := h.FindConnection(c.Params("id"))
	fromCache := fiber.Query[bool](c, "from_cache", false)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	return connectionDetail(c, connection, fromCache)
}

func connectionDetail(c fiber.Ctx, connection *model.Connection, fromCache bool) error {
	var schemas = make([]string, 0)
	var tables = make([]string, 0)
	var err error

	databases, err := getDatabases(connection.ID, fromCache)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	version, err := getVersion(connection.ID, fromCache)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	if connection.CurrentDatabase.String == "" {
		return c.JSON(response.Success(response.Connection(connection, version, databases, schemas, tables)))
	}

	schemas, err = getSchemas(connection.ID, connection.CurrentDatabase.String, fromCache)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	currentSchema := connection.CurrentSchema.String

	if connection.CurrentSchema.String == "" && len(schemas) > 0 {
		currentSchema = schemas[0]
	}

	if currentSchema != "" {
		tables, err = getTables(connection.ID, currentSchema, fromCache)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
		}
	}

	app.DB().Model(&connection).Updates(&model.Connection{
		CurrentSchema: sql.NullString{
			String: currentSchema,
			Valid:  true,
		},
		IsActive: true,
	})

	return c.JSON(response.Success(response.Connection(connection, version, databases, schemas, tables)))
}

func getDatabases(connectionID uint, fromCache bool) ([]string, error) {
	var databases []string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("databases_%d", connectionID),
		&databases,
		fromCache,
	)

	if err != nil || databases == nil {
		databases, err = app.Drivers().Pgsql.Databases(int32(connectionID), false)

		if err != nil {
			return databases, err
		}

		err = app.Cache().Set(fmt.Sprintf("databases_%d", connectionID), databases, nil)
		if err != nil {
			return databases, err
		}
	}

	return databases, err
}

func getVersion(connectionID uint, fromCache bool) (string, error) {
	var version string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("version_%d", connectionID),
		&version,
		fromCache,
	)

	if err != nil || version == "" {
		version, err = app.Drivers().Pgsql.Version(int32(connectionID))

		if err != nil {
			return version, err
		}

		err = app.Cache().Set(fmt.Sprintf("version_%d", connectionID), version, nil)
		if err != nil {
			return version, err
		}
	}

	return version, err
}

func getSchemas(connectionID uint, databaseName string, fromCache bool) ([]string, error) {
	var schemas []string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("schemas_%d", connectionID),
		&schemas,
		fromCache,
	)

	if err != nil || schemas == nil {
		schemas, err = app.Drivers().Pgsql.Schemas(int32(connectionID), databaseName, false)

		if err != nil {
			return schemas, err
		}

		err = app.Cache().Set(fmt.Sprintf("schemas_%d", connectionID), schemas, nil)
		if err != nil {
			return schemas, err
		}
	}

	return schemas, err
}

func getTables(connectionID uint, schemaName string, fromCache bool) ([]string, error) {
	var tables []string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("tables_%d", connectionID),
		&tables,
		fromCache,
	)

	if err != nil || tables == nil {
		tables, err = app.Drivers().Pgsql.Tables(int32(connectionID), schemaName)

		if err != nil {
			return tables, err
		}

		err = app.Cache().Set(fmt.Sprintf("tables_%d", connectionID), tables, nil)
		if err != nil {
			return tables, err
		}
	}

	return tables, err
}
