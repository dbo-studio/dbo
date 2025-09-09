package serviceConfig

import (
	"context"
	"time"

	"github.com/goccy/go-json"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai_provider"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/gofiber/fiber/v3/client"
)

type IConfigService interface {
	Index(ctx context.Context) (*dto.ConfigListResponse, error)
	CheckUpdate(ctx context.Context) (*dto.ConfigCheckUpdateResponse, error)
}

type IConfigServiceImpl struct {
	cfg               *config.Config
	aiProviderService serviceAiProvider.IAiProviderService
	cache             cache.Cache
}

func NewConfigService(cfg *config.Config, cache cache.Cache, aiProviderService serviceAiProvider.IAiProviderService) IConfigService {
	return &IConfigServiceImpl{
		cfg:               cfg,
		aiProviderService: aiProviderService,
		cache:             cache,
	}
}

func (i IConfigServiceImpl) Index(ctx context.Context) (*dto.ConfigListResponse, error) {
	providers, err := i.aiProviderService.Index(ctx)
	if err != nil {
		return nil, err
	}

	go func() {
		_, err := i.CheckUpdate(context.Background())
		if err != nil {
			return
		}
	}()

	response := &dto.ConfigListResponse{
		Version:           i.cfg.App.Version,
		NewReleaseVersion: nil,
		Url:               "http://127.0.0.1:" + i.cfg.App.Port + "/api",
		Providers:         providers.Items,
	}

	var newReleaseVersion *dto.ConfigCheckUpdateResponse
	err = i.cache.Get("new_release_version", &newReleaseVersion)
	if err != nil {
		return nil, err
	}

	if newReleaseVersion != nil {
		response.NewReleaseVersion = newReleaseVersion
	}

	return response, nil
}

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

	version, err := helper.ParseVersion(releaseResponse.Data.TagName)
	if err != nil {
		return nil, err
	}

	currentVersion, err := helper.ParseVersion(i.cfg.App.Version)
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

	if version.IsNewerThan(currentVersion) {
		err := i.cache.Set("new_release_version", response, nil)
		if err != nil {
			return nil, err
		}
	}

	return response, nil
}
