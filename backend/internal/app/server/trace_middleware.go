package server

import (
	"context"

	"github.com/dbo-studio/dbo/pkg/observability/instrumentation"
	"github.com/gofiber/fiber/v3"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
)

// requestHeaderCarrier adapts Fiber request headers to OpenTelemetry TextMapCarrier
type requestHeaderCarrier struct {
	headers map[string][]string
}

func (c requestHeaderCarrier) Get(key string) string {
	if v, ok := c.headers[key]; ok && len(v) > 0 {
		return v[0]
	}
	return ""
}

func (c requestHeaderCarrier) Set(key string, value string) {}

func (c requestHeaderCarrier) Keys() []string {
	keys := make([]string, 0, len(c.headers))
	for k := range c.headers {
		keys = append(keys, k)
	}
	return keys
}

// responseHeaderCarrier adapts Fiber response headers to OpenTelemetry TextMapCarrier
type responseHeaderCarrier struct {
	c fiber.Ctx
}

func (c responseHeaderCarrier) Get(key string) string {
	return c.c.GetRespHeader(key)
}

func (c responseHeaderCarrier) Set(key string, value string) {
	c.c.Set(key, value)
}

func (c responseHeaderCarrier) Keys() []string { return nil }

func traceMiddleware(ctx fiber.Ctx) error {
	// Extract parent context from incoming headers
	prop := otel.GetTextMapPropagator()
	parent := prop.Extract(context.Background(), requestHeaderCarrier{headers: ctx.GetReqHeaders()})

	// Create span
	routePath := ""
	if ctx.Route() != nil {
		routePath = ctx.Route().Path
	}
	if routePath == "" {
		routePath = ctx.Path()
	}
	spanName := ctx.Method() + " " + routePath

	spanCtx, span := instrumentation.NewTraceSpan(parent, spanName)
	defer span.End()

	// Add basic HTTP attributes
	span.SetAttributes(
		attribute.String("http.method", ctx.Method()),
		attribute.String("http.route", routePath),
		attribute.String("http.target", ctx.Path()),
		attribute.String("http.scheme", ctx.Scheme()),
		attribute.String("server.address", ctx.Host()),
		attribute.String("user_agent", string(ctx.Request().Header.UserAgent())),
	)

	// Make span context available to downstream handlers if needed
	_ = ctx.Locals("otel-context", spanCtx)

	// Continue
	err := ctx.Next()

	// Status code and error
	status := ctx.Response().StatusCode()
	span.SetAttributes(attribute.Int("http.status_code", status))
	if err != nil {
		span.RecordError(err)
	}
	if status >= 400 {
		// Mark as error for 4xx/5xx
		span.RecordError(err)
	}

	// Inject trace headers into response for correlation
	prop.Inject(spanCtx, responseHeaderCarrier{c: ctx})

	return err
}
