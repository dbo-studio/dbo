package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	serviceConnector "github.com/dbo-studio/dbo/internal/service/connector"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

// ConnectorHandler serves backup destinations and notification channels, which are the
// same kind of record with a different kind.
type ConnectorHandler struct {
	logger  logger.Logger
	service serviceConnector.IConnectorService
	kind    string
}

func NewDestinationHandler(logger logger.Logger, service serviceConnector.IConnectorService) *ConnectorHandler {
	return &ConnectorHandler{logger: logger, service: service, kind: model.ConnectorKindDestination}
}

func NewChannelHandler(logger logger.Logger, service serviceConnector.IConnectorService) *ConnectorHandler {
	return &ConnectorHandler{logger: logger, service: service, kind: model.ConnectorKindChannel}
}

func (h ConnectorHandler) fail(c fiber.Ctx, err error) error {
	h.logger.Error(err.Error())

	return response.ErrorBuilder().FromError(err).Send(c)
}

func (h ConnectorHandler) body(c fiber.Ctx) (*dto.ConnectorRequest, error) {
	req := new(dto.ConnectorRequest)
	if err := c.Bind().Body(req); err != nil {
		return nil, apperror.BadRequest(err)
	}

	req.ID = fiber.Params[uint](c, "id")
	if err := req.Validate(); err != nil {
		return nil, apperror.Validation(err)
	}

	return req, nil
}

func (h ConnectorHandler) List(c fiber.Ctx) error {
	result, err := h.service.List(c, h.kind)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h ConnectorHandler) Create(c fiber.Ctx) error {
	req, err := h.body(c)
	if err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	result, err := h.service.Create(c, h.kind, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h ConnectorHandler) Update(c fiber.Ctx) error {
	req, err := h.body(c)
	if err != nil {
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	result, err := h.service.Update(c, h.kind, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h ConnectorHandler) Delete(c fiber.Ctx) error {
	if err := h.service.Delete(c, h.kind, fiber.Params[uint](c, "id")); err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().Send(c)
}

func (h ConnectorHandler) Test(c fiber.Ctx) error {
	if err := h.service.Test(c, h.kind, fiber.Params[uint](c, "id")); err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().Send(c)
}

// AuthURL starts the Google Drive consent flow; the browser then returns to OAuthCallback.
func (h ConnectorHandler) AuthURL(c fiber.Ctx) error {
	redirect := c.BaseURL() + "/api/public/backup-destinations/oauth/callback"

	url, err := h.service.DriveAuthURL(c, fiber.Params[uint](c, "id"), redirect)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(dto.ConnectorAuthURLResponse{URL: url}).Send(c)
}

// OAuthCallback is the public page Google sends the browser back to. The encrypted, expiring
// state is the proof of who started the flow.
func (h ConnectorHandler) OAuthCallback(c fiber.Ctx) error {
	c.Set("Content-Type", "text/html; charset=utf-8")

	if c.Query("error") != "" || c.Query("code") == "" {
		return c.Status(fiber.StatusBadRequest).SendString("<p>Authorization was cancelled. You can close this window.</p>")
	}

	if err := h.service.DriveExchange(c, c.Query("state"), c.Query("code")); err != nil {
		h.logger.Error(err.Error())

		return c.Status(fiber.StatusBadRequest).SendString("<p>Authorization failed. Close this window and try again.</p>")
	}

	return c.SendString("<p>Google Drive is connected. You can close this window and return to DBO.</p>")
}
