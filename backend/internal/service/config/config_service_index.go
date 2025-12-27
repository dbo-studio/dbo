package serviceConfig

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

func (i IConfigServiceImpl) Index(ctx context.Context) (*dto.ConfigListResponse, error) {
	providers, err := i.aiProviderService.Index(ctx)
	if err != nil {
		return nil, err
	}

	go func() {
		_, err := i.CheckUpdate(ctx)
		if err != nil {
			return
		}
	}()

	response := &dto.ConfigListResponse{
		Version:           i.cfg.App.Version,
		NewReleaseVersion: nil,
		Url:               "http://127.0.0.1:" + i.cfg.App.Port + "/api",
		Providers:         providers.Items,
		LogsPath:          i.cfg.App.LogPath,
	}

	var newReleaseVersion *dto.ConfigCheckUpdateResponse
	err = i.cache.Get(ctx, "new_release_version", &newReleaseVersion)
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
