package repository

import (
	"context"
	"crypto/sha256"
	"strings"
	"sync"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/internal/model"
	secretStore "github.com/dbo-studio/dbo/internal/service/secret_store"
	"github.com/dbo-studio/dbo/pkg/cryptoutil"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type AiProviderRepoImpl struct {
	db *gorm.DB
}

func NewAiProviderRepo(db *gorm.DB) IAiProviderRepo {
	return &AiProviderRepoImpl{
		db: db,
	}
}

func (r AiProviderRepoImpl) Index(ctx context.Context) ([]model.AiProvider, error) {
	var items []model.AiProvider

	err := r.db.WithContext(ctx).Order("id").Find(&items).Error
	if err != nil {
		return nil, err
	}

	for i := range items {
		items[i].APIKey = decryptAIKey(aiProviderCipherKey(), items[i].APIKey)
	}

	return items, nil
}

func (r AiProviderRepoImpl) Find(ctx context.Context, id uint) (*model.AiProvider, error) {
	var item model.AiProvider
	if err := r.db.WithContext(ctx).First(&item, id).Error; err != nil {
		return nil, err
	}

	item.APIKey = decryptAIKey(aiProviderCipherKey(), item.APIKey)

	return &item, nil
}

func (r AiProviderRepoImpl) FindActive(ctx context.Context) (*model.AiProvider, error) {
	var item model.AiProvider
	if err := r.db.WithContext(ctx).Where("is_active = ?", true).First(&item).Error; err != nil {
		return nil, err
	}

	item.APIKey = decryptAIKey(aiProviderCipherKey(), item.APIKey)

	return &item, nil
}

func (r AiProviderRepoImpl) CreateIfNotExists(ctx context.Context, provider *model.AiProvider) (*model.AiProvider, error) {
	existingProvider := &model.AiProvider{}
	result := r.db.WithContext(ctx).Where("type = ?", provider.Type).First(existingProvider)

	if result.Error != nil {
		provider.APIKey = encryptAIKey(aiProviderCipherKey(), provider.APIKey)
		result = r.db.WithContext(ctx).Create(provider)
	}

	return provider, result.Error
}

func (r AiProviderRepoImpl) Update(ctx context.Context, provider *model.AiProvider, dto *dto.AiProviderUpdateRequest) (*model.AiProvider, error) {
	provider.URL = lo.FromPtr(helper.Optional(dto.URL, lo.ToPtr(provider.URL)))
	provider.APIKey = encryptAIKey(aiProviderCipherKey(), helper.Optional(dto.APIKey, provider.APIKey))
	provider.Timeout = lo.FromPtr(helper.Optional(dto.Timeout, lo.ToPtr(provider.Timeout)))
	provider.IsActive = lo.FromPtr(helper.Optional(dto.IsActive, lo.ToPtr(provider.IsActive)))
	provider.Model = lo.FromPtr(helper.Optional(dto.Model, lo.ToPtr(provider.Model)))

	if dto.Models != nil {
		provider.Models = lo.FromPtr(dto.Models)
	}

	result := r.db.WithContext(ctx).Save(provider)

	return provider, result.Error
}

func (r AiProviderRepoImpl) MakeAllProvidersNotActive(ctx context.Context, provider *model.AiProvider, req *dto.AiProviderUpdateRequest) error {
	if req.IsActive != nil && *req.IsActive {
		result := r.db.WithContext(ctx).Model(&model.AiProvider{}).Not("id", provider.ID).Update("is_active", false)
		return result.Error
	}

	return nil
}

// AI provider API keys are encrypted at rest with the app secret key. Values
// carry the enc:v1: prefix; legacy plaintext rows keep working and are
// re-encrypted on their next save.
const aiKeyCipherPrefix = "enc:v1:"

var (
	aiKeyOnce sync.Once
	aiKey     []byte
)

func aiProviderCipherKey() []byte {
	aiKeyOnce.Do(func() {
		cfg := container.Instance().Config()
		if cfg == nil {
			return
		}

		secret, err := secretStore.LoadOrCreateAppSecretKey(cfg)
		if err != nil {
			return
		}

		sum := sha256.Sum256([]byte(secret))
		aiKey = sum[:]
	})

	return aiKey
}

func encryptAIKey(key []byte, plain *string) *string {
	if key == nil || plain == nil || *plain == "" || strings.HasPrefix(*plain, aiKeyCipherPrefix) {
		return plain
	}

	ciphertext, err := cryptoutil.EncryptAESGCM(key, []byte(*plain))
	if err != nil {
		return plain
	}

	out := aiKeyCipherPrefix + ciphertext

	return &out
}

func decryptAIKey(key []byte, stored *string) *string {
	if key == nil || stored == nil || !strings.HasPrefix(*stored, aiKeyCipherPrefix) {
		return stored
	}

	plaintext, err := cryptoutil.DecryptAESGCM(key, strings.TrimPrefix(*stored, aiKeyCipherPrefix))
	if err != nil {
		empty := ""

		return &empty
	}

	out := string(plaintext)

	return &out
}
