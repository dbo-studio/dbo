package handler

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/drivers/pgsql"
	"github.com/khodemobin/dbo/helper"
	"github.com/khodemobin/dbo/model"
	"github.com/khodemobin/dbo/types"
)

type ConnectionHandler struct{}

func (h *ConnectionHandler) Connections(c *fiber.Ctx) error {
	var connections []model.Connection

	result := app.DB().Find(&connections)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(result.Error.Error()))
	}

	return c.JSON(response.Success(response.Connections(connections)))
}

func (h *ConnectionHandler) Connection(c *fiber.Ctx) error {
	connectionId := c.Params("id")

	var connection model.Connection
	result := app.DB().Where("id", "=", connectionId).First(&connection)
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(result.Error.Error())
	}

	databases, _ := pgsql.Databases(int32(connection.ID))
	schemas, _ := pgsql.Schemas(int32(connection.ID))
	currentDb := c.Query("database", connection.Database)
	currentSchema := c.Query("schema")
	var tables []string
	var err error

	if currentSchema == "" && len(schemas) > 0 {
		currentSchema = schemas[0]
	}

	if currentDb != "" || currentSchema != "" {
		tables, err = pgsql.Tables(int32(connection.ID), currentSchema)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(err.Error())
		}
	}

	return c.JSON(response.Success(response.Connection(connection, databases, schemas, currentDb, currentSchema, tables)))
}

func (h *ConnectionHandler) AddConnection(c *fiber.Ctx) error {
	req := new(types.ConnectionRequest)

	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	var connection model.Connection
	connection.Name = req.Name
	connection.Host = req.Host
	connection.Username = req.Username
	connection.Password = sql.NullString{
		Valid:  true,
		String: req.Password,
	}
	connection.Port = uint(req.Port)
	connection.Database = req.Database

	result := app.DB().Save(&connection)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(result.Error.Error()))
	}

	return c.JSON(response.Success(response.Connection(connection, []string{}, []string{}, "", "", []string{})))
}

func (h *ConnectionHandler) UpdateConnection(c *fiber.Ctx) error {
	req := new(types.ConnectionRequest)

	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	connectionId := c.Params("id")
	var connection model.Connection
	result := app.DB().Where("id", "=", connectionId).First(&connection)
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(result.Error.Error())
	}

	connection.Name = req.Name
	connection.Host = req.Host
	connection.Username = req.Username
	connection.Password = sql.NullString{
		Valid:  true,
		String: req.Password,
	}
	connection.Port = uint(req.Port)
	connection.Database = req.Database

	result = app.DB().Save(&connection)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(result.Error.Error()))
	}

	return c.JSON(response.Success(response.Connection(connection, []string{}, []string{}, "", "", []string{})))
}

func (h *ConnectionHandler) DeleteConnection(c *fiber.Ctx) error {
	connectionId := c.Params("id")
	app.DB().Delete(&model.Connection{}, connectionId)

	return c.JSON(response.Success(""))
}

func (h *ConnectionHandler) TestConnection(c *fiber.Ctx) error {
	req := new(types.ConnectionRequest)

	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	_, err := pgsql.ConnectWithOptions(pgsql.ConnectionOption{
		Host:     req.Host,
		Port:     int32(req.Port),
		User:     req.Username,
		Password: req.Password,
		Database: req.Database,
	})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(""))
}
