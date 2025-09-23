package observability

import (
	"context"

	sdkresource "go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func initResource(appName string, appVersion string, appEnv string) *sdkresource.Resource {
	extraResource, _ := sdkresource.New(
		context.Background(),
		sdkresource.WithOS(),
		sdkresource.WithProcess(),
		sdkresource.WithContainer(),
		sdkresource.WithHost(),
		sdkresource.WithAttributes(
			semconv.ServiceName(appName),
			semconv.ServiceVersion(appVersion),
			semconv.DeploymentEnvironment(appEnv),
		),
	)

	resource, _ := sdkresource.Merge(
		sdkresource.Default(),
		extraResource,
	)

	return resource
}
