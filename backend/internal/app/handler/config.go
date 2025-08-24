package handler

import (
	"github.com/dbo-studio/dbo/config"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai_provider"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type ConfigHandler struct {
	cfg               *config.Config
	aiProviderService serviceAiProvider.IAiProviderService
}

func NewConfigHandler(cfg *config.Config, aiProviderService serviceAiProvider.IAiProviderService) *ConfigHandler {
	return &ConfigHandler{
		cfg:               cfg,
		aiProviderService: aiProviderService,
	}
}

func (h *ConfigHandler) Config(c fiber.Ctx) error {
	providers, err := h.aiProviderService.Index(c)
	if err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(
		map[string]any{
			"url":       "http://127.0.0.1:" + h.cfg.App.Port + "/api",
			"version":   h.cfg.App.Version,
			"providers": providers.Items,
		},
	).Send(c)
}
