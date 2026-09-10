package repository

import (
	"context"
	"errors"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/cryptoutil"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type AiProviderRepoImpl struct {
	db        *gorm.DB
	cipherKey []byte
}

func NewAiProviderRepo(db *gorm.DB, cipherKey []byte) IAiProviderRepo {
	return &AiProviderRepoImpl{
		db:        db,
		cipherKey: cipherKey,
	}
}

func (r AiProviderRepoImpl) Index(ctx context.Context) ([]model.AiProvider, error) {
	var items []model.AiProvider

	err := r.db.WithContext(ctx).Order("id").Find(&items).Error
	if err != nil {
		return nil, err
	}

	for i := range items {
		items[i].APIKey = decryptAIKey(r.cipherKey, items[i].APIKey)
	}

	return items, nil
}

func (r AiProviderRepoImpl) Find(ctx context.Context, id uint) (*model.AiProvider, error) {
	var item model.AiProvider
	if err := r.db.WithContext(ctx).First(&item, id).Error; err != nil {
		return nil, err
	}

	item.APIKey = decryptAIKey(r.cipherKey, item.APIKey)

	return &item, nil
}

func (r AiProviderRepoImpl) FindActive(ctx context.Context) (*model.AiProvider, error) {
	var item model.AiProvider
	if err := r.db.WithContext(ctx).Where("is_active = ?", true).First(&item).Error; err != nil {
		return nil, err
	}

	item.APIKey = decryptAIKey(r.cipherKey, item.APIKey)

	return &item, nil
}

func (r AiProviderRepoImpl) CreateIfNotExists(ctx context.Context, provider *model.AiProvider) (*model.AiProvider, error) {
	existingProvider := &model.AiProvider{}
	result := r.db.WithContext(ctx).Where("type = ?", provider.Type).First(existingProvider)

	if result.Error != nil {
		encrypted, err := encryptAIKey(r.cipherKey, provider.APIKey)
		if err != nil {
			return nil, err
		}

		provider.APIKey = encrypted
		result = r.db.WithContext(ctx).Create(provider)
	}

	return provider, result.Error
}

func (r AiProviderRepoImpl) Update(ctx context.Context, provider *model.AiProvider, dto *dto.AiProviderUpdateRequest) (*model.AiProvider, error) {
	provider.URL = lo.FromPtr(helper.Optional(dto.URL, lo.ToPtr(provider.URL)))

	encrypted, err := encryptAIKey(r.cipherKey, helper.Optional(dto.APIKey, provider.APIKey))
	if err != nil {
		return nil, err
	}

	provider.APIKey = encrypted
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

var errAIKeyEncryption = errors.New("failed to encrypt AI provider API key")

func encryptAIKey(key []byte, plain *string) (*string, error) {
	if plain == nil || *plain == "" || strings.HasPrefix(*plain, aiKeyCipherPrefix) {
		return plain, nil
	}

	if len(key) == 0 {
		return nil, errAIKeyEncryption
	}

	ciphertext, err := cryptoutil.EncryptAESGCM(key, []byte(*plain))
	if err != nil {
		return nil, errAIKeyEncryption
	}

	out := aiKeyCipherPrefix + ciphertext

	return &out, nil
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
