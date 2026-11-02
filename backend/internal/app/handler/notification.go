package handler

import (
	"bufio"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceEvents "github.com/dbo-studio/dbo/internal/service/events"
	serviceNotification "github.com/dbo-studio/dbo/internal/service/notification"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/goccy/go-json"
	"github.com/gofiber/fiber/v3"
)

// Behind a proxy that closes idle connections (the server's own idle timeout is 120s) the stream needs traffic.
const heartbeatEvery = 20 * time.Second

type NotificationHandler struct {
	logger  logger.Logger
	service serviceNotification.INotificationService
	hub     serviceEvents.IHub
}

func NewNotificationHandler(logger logger.Logger, service serviceNotification.INotificationService, hub serviceEvents.IHub) *NotificationHandler {
	return &NotificationHandler{logger: logger, service: service, hub: hub}
}

func (h NotificationHandler) send(c fiber.Ctx, data any, err error) error {
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(data).Send(c)
}

func (h NotificationHandler) List(c fiber.Ctx) error {
	req := new(dto.NotificationListRequest)
	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	list, err := h.service.List(c, req)

	return h.send(c, list, err)
}

func (h NotificationHandler) MarkRead(c fiber.Ctx) error {
	return h.send(c, nil, h.service.MarkRead(c, fiber.Params[uint](c, "id")))
}

func (h NotificationHandler) MarkAllRead(c fiber.Ctx) error {
	return h.send(c, nil, h.service.MarkAllRead(c))
}

func (h NotificationHandler) Delete(c fiber.Ctx) error {
	return h.send(c, nil, h.service.Delete(c, fiber.Params[uint](c, "id")))
}

// Stream is one Server-Sent Events stream per client, scoped to the signed-in owner. It only wakes the client:
// the database stays the source of truth, so a dropped event loses nothing.
func (h NotificationHandler) Stream(c fiber.Ctx) error {
	owner := helper.CtxOwnerID(c)

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no") // nginx must not buffer the stream

	events, unsubscribe := h.hub.Subscribe(owner)

	return c.SendStreamWriter(func(w *bufio.Writer) {
		defer unsubscribe()

		write := func(format string, args ...any) bool {
			if _, err := fmt.Fprintf(w, format, args...); err != nil {
				return false
			}

			return w.Flush() == nil
		}

		// An open comment tells the client the stream is live before the first real event.
		if !write(": connected\n\n") {
			return
		}

		ticker := time.NewTicker(heartbeatEvery)
		defer ticker.Stop()

		for {
			select {
			case event, ok := <-events:
				if !ok {
					return
				}

				payload, err := json.Marshal(event.Data)
				if err != nil {
					continue
				}

				// A write error is how a closed client is noticed.
				if !write("event: %s\ndata: %s\n\n", event.Type, payload) {
					return
				}
			case <-ticker.C:
				if !write(": ping\n\n") {
					return
				}
			}
		}
	})
}
