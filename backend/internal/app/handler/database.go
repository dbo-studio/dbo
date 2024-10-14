package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceConnection "github.com/dbo-studio/dbo/internal/service/connection"
	serviceDatabase "github.com/dbo-studio/dbo/internal/service/database"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type DatabaseHandler struct {
	logger            logger.Logger
	connectionService serviceConnection.IConnectionService
	databaseService   serviceDatabase.IDatabaseService
}

func NewDatabaseHandler(logger logger.Logger, connectionService serviceConnection.IConnectionService, databaseService serviceDatabase.IDatabaseService) *DatabaseHandler {
	return &DatabaseHandler{
		logger:            logger,
		connectionService: connectionService,
		databaseService:   databaseService,
	}
}

func (h DatabaseHandler) CreateDatabase(c fiber.Ctx) error {
	req := new(dto.CreateDatabaseRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder(apperror.Validation(err)).Send(c)
	}

	err := h.databaseService.CreateDatabase(c.Context(), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder("").Send(c)
}

func (h DatabaseHandler) DeleteDatabase(c fiber.Ctx) error {
	req := new(dto.DeleteDatabaseRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder(apperror.Validation(err)).Send(c)
	}

	err := h.databaseService.DeleteDatabase(c.Context(), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder("").Send(c)
}

func (h DatabaseHandler) MetaData(c fiber.Ctx) error {
	metadata, err := h.databaseService.MetaData(c.Context(), fiber.Query[int32](c, "connection_id"))
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}
	return response.SuccessBuilder(metadata).Send(c)
}
