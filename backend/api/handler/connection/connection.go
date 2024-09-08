package connection_handler

import (
	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/internal/service"
	"github.com/dbo-studio/dbo/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type ConnectionHandler struct {
	ConnectionService service.IConnectionService
}

func (h *ConnectionHandler) FindConnection(connectionId string) (*model.Connection, error) {
	var connection model.Connection
	result := app.DB().Where("id", "=", connectionId).First(&connection)

	return &connection, result.Error
}

func (h *ConnectionHandler) Connections(c fiber.Ctx) error {
	connections, err := h.ConnectionService.Connections(c.Context())
	if err != nil {
		app.Log().Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(connections).Send(c)
}

func (h *ConnectionHandler) CreateConnection(c fiber.Ctx) error {
	req := new(dto.CreateConnectionRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder(apperror.Validation(err)).Send(c)
	}

	connection, err := h.ConnectionService.CreateConnection(c.Context(), req)
	if err != nil {
		app.Log().Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(connection).Send(c)
}

func (h *ConnectionHandler) ConnectionDetail(c fiber.Ctx) error {
	req := &dto.ConnectionDetailRequest{
		ConnectionId: fiber.Params[int32](c, "id"),
		FromCache:    fiber.Query[bool](c, "from_cache"),
	}

	connection, err := h.ConnectionService.ConnectionDetail(c.Context(), req)
	if err != nil {
		app.Log().Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(connection).Send(c)
}

func (h *ConnectionHandler) DeleteConnection(c fiber.Ctx) error {
	connectionId := fiber.Params[int32](c, "id")
	connections, err := h.ConnectionService.DeleteConnection(c.Context(), connectionId)
	if err != nil {
		app.Log().Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(connections).Send(c)
}
