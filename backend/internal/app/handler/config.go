package handler

import (
	"github.com/dbo-studio/dbo/internal/container"
	serviceConfig "github.com/dbo-studio/dbo/internal/service/config"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type ConfigHandler struct {
	logger        logger.Logger
	configService serviceConfig.IConfigService
}

func NewConfigHandler(configService serviceConfig.IConfigService) *ConfigHandler {
	return &ConfigHandler{
		logger:        container.Instance().Logger(),
		configService: configService,
	}
}

func (h ConfigHandler) Config(c fiber.Ctx) error {
	items, err := h.configService.Index(c)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(items).Send(c)
}

func (h ConfigHandler) CheckUpdate(c fiber.Ctx) error {
	items, err := h.configService.CheckUpdate(c)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(items).Send(c)
}

func (h ConfigHandler) Logs(c fiber.Ctx) error {
	err := h.configService.Logs(c)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return nil
}
