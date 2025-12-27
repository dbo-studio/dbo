package serviceConfig

import (
	"context"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/gofiber/fiber/v3/client"
)

type ReleaseResponse struct {
	Success bool `json:"success"`
	Data    struct {
		TagName     string `json:"tag_name"`
		Name        string `json:"name"`
		Body        string `json:"body"`
		PublishedAt string `json:"published_at"`
		IsMinimum   bool   `json:"is_minimum"`
	} `json:"data"`
	Timestamp string `json:"timestamp"`
}

func (i IConfigServiceImpl) CheckUpdate(ctx context.Context) (*dto.ConfigCheckUpdateResponse, error) {
	cc := client.New()
	cc.SetTimeout(10 * time.Second)

	resp, err := cc.Get(i.cfg.App.ReleaseUrlApi)
	if err != nil {
		return nil, err
	}

	var releaseResponse ReleaseResponse
	err = json.Unmarshal(resp.Body(), &releaseResponse)
	if err != nil {
		return nil, err
	}

	response := &dto.ConfigCheckUpdateResponse{
		Name:        releaseResponse.Data.Name,
		Url:         i.cfg.App.ReleaseUrl,
		Body:        releaseResponse.Data.Body,
		PublishedAt: releaseResponse.Data.PublishedAt,
		IsMinimum:   releaseResponse.Data.IsMinimum,
	}

	isNewer, err := isNewerVersion(i.cfg.App.Version, releaseResponse.Data.TagName)
	if err != nil {
		return nil, err
	}

	if isNewer {
		err := i.cache.Set(ctx, "new_release_version", response, nil)
		if err != nil {
			return nil, err
		}
	} else {
		err := i.cache.Delete(ctx, "new_release_version")
		if err != nil {
			return nil, err
		}
	}

	return response, nil
}

func isNewerVersion(currentVersion, newVersion string) (bool, error) {
	version, err := helper.ParseVersion(newVersion)
	if err != nil {
		return false, err
	}

	cVersion, err := helper.ParseVersion(currentVersion)
	if err != nil {
		return false, err
	}

	return version.IsNewerThan(cVersion), nil
}
