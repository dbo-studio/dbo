package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/container"
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

func NewConnectionHandler(connectionService serviceConnection.IConnectionService) *ConnectionHandler {
	return &ConnectionHandler{
		logger:            container.Instance().Logger(),
		connectionService: connectionService,
	}
}

func (h ConnectionHandler) Connections(c fiber.Ctx) error {
	data, err := h.connectionService.Index(c)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(data.Connections).Send(c)
}

func (h ConnectionHandler) Create(c fiber.Ctx) error {
	req := new(dto.CreateConnectionRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	connection, err := h.connectionService.Create(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(connection).Send(c)
}

func (h ConnectionHandler) Detail(c fiber.Ctx) error {
	req := &dto.ConnectionDetailRequest{
		ConnectionId: fiber.Params[int32](c, "id"),
	}

	connection, err := h.connectionService.Detail(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(connection).Send(c)
}

func (h ConnectionHandler) Delete(c fiber.Ctx) error {
	connectionId := fiber.Params[int32](c, "id")
	data, err := h.connectionService.Delete(c, connectionId)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(data.Connections).Send(c)
}

func (h ConnectionHandler) Ping(c fiber.Ctx) error {
	req := new(dto.CreateConnectionRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	err := h.connectionService.Ping(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().Send(c)
}

func (h ConnectionHandler) Update(c fiber.Ctx) error {
	connectionId := fiber.Params[int32](c, "id")
	req := new(dto.UpdateConnectionRequest)

	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	connection, err := h.connectionService.Update(c, connectionId, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(connection).Send(c)
}
