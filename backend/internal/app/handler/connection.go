package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceConnection "github.com/dbo-studio/dbo/internal/service/connection"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type ConnectionHandler struct {
	logger            logger.Logger
	connectionService serviceConnection.IConnectionService
}

func NewConnectionHandler(logger logger.Logger, connectionService serviceConnection.IConnectionService) *ConnectionHandler {
	return &ConnectionHandler{
		logger:            logger,
		connectionService: connectionService,
	}
}

func (h ConnectionHandler) Connections(c fiber.Ctx) error {
	data, err := h.connectionService.Index(c.Context())
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(data.Connections).Send(c)
}

func (h ConnectionHandler) CreateConnection(c fiber.Ctx) error {
	req := new(dto.CreateConnectionRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder(apperror.Validation(err)).Send(c)
	}

	connection, err := h.connectionService.Create(c.Context(), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(connection).Send(c)
}

func (h ConnectionHandler) ConnectionDetail(c fiber.Ctx) error {
	req := &dto.ConnectionDetailRequest{
		ConnectionId: fiber.Params[int32](c, "id"),
	}

	connection, err := h.connectionService.Detail(c.Context(), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(connection).Send(c)
}

func (h ConnectionHandler) DeleteConnection(c fiber.Ctx) error {
	connectionId := fiber.Params[int32](c, "id")
	data, err := h.connectionService.Delete(c.Context(), connectionId)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(data.Connections).Send(c)
}

func (h ConnectionHandler) TestConnection(c fiber.Ctx) error {
	req := new(dto.CreateConnectionRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder(apperror.Validation(err)).Send(c)
	}

	err := h.connectionService.Test(c.Context(), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder("").Send(c)
}

func (h ConnectionHandler) UpdateConnection(c fiber.Ctx) error {
	connectionId := fiber.Params[int32](c, "id")
	req := new(dto.UpdateConnectionRequest)

	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder(apperror.Validation(err)).Send(c)
	}

	connection, err := h.connectionService.Update(c.Context(), connectionId, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(connection).Send(c)
}
