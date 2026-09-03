package serviceConfig

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/pkg/cache"
)

func (i IConfigServiceImpl) Index(ctx context.Context) (*dto.ConfigListResponse, error) {
	providers, err := i.aiProviderService.Index(ctx)
	if err != nil {
		return nil, err
	}

	go func() {
		// Detach from the request context: Index returns long before the
		// update check finishes, and canceling with it would abort the
		// cache write mid-flight.
		ctx := context.WithoutCancel(ctx)

		if _, err := i.CheckUpdate(ctx); err != nil {
			container.Instance().Logger().Error(fmt.Errorf("background update check failed: %w", err))
		}
	}()

	response := &dto.ConfigListResponse{
		Version:           i.cfg.App.Version,
		NewReleaseVersion: nil,
		URL:               i.cfg.App.APIPublicURL(),
		Providers:         providers.Items,
		LogsPath:          i.cfg.App.LogPath,
	}

	var newReleaseVersion *dto.ConfigCheckUpdateResponse

	err = i.cache.Get(ctx, cache.NewReleaseVersionKey, &newReleaseVersion)
	if err != nil {
		return nil, err
	}

	if newReleaseVersion != nil {
		isNewer, err := isNewerVersion(i.cfg.App.Version, newReleaseVersion.Name)
		if err != nil {
			return nil, err
		}

		if isNewer {
			response.NewReleaseVersion = newReleaseVersion
		}
	}

	return response, nil
}
