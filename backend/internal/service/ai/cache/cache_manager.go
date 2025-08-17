package serviceAiCache

import (
	"crypto/sha1"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/cache"
)

type ICacheManager interface {
	GetCompletionResponse(key string) (*dto.AiInlineCompleteResponse, bool)
	SetCompletionResponse(key string, response *dto.AiInlineCompleteResponse, ttl time.Duration) error
	GenerateCompletionKey(req *dto.AiInlineCompleteRequest, provider *model.AiProvider) string
}

type CacheManager struct {
	cache cache.Cache
}

func NewCacheManager(c cache.Cache) ICacheManager {
	return &CacheManager{
		cache: c,
	}
}

func (cm *CacheManager) GetCompletionResponse(key string) (*dto.AiInlineCompleteResponse, bool) {
	var response dto.AiInlineCompleteResponse
	if err := cm.cache.Get(key, &response); err == nil {
		return &response, true
	}

	var str string
	if err := cm.cache.Get(key, &str); err == nil {
		return &dto.AiInlineCompleteResponse{Completion: str}, true
	}

	return nil, false
}

func (cm *CacheManager) SetCompletionResponse(key string, response *dto.AiInlineCompleteResponse, ttl time.Duration) error {
	return cm.cache.Set(key, response, &ttl)
}

func (cm *CacheManager) GenerateCompletionKey(req *dto.AiInlineCompleteRequest, provider *model.AiProvider) string {
	var keyBuilder string

	if provider != nil {
		keyBuilder += fmt.Sprintf("provider:%d|model:%s|", provider.ID, strings.Join(provider.Models, ","))
		if provider.Url != "" {
			keyBuilder += fmt.Sprintf("baseurl:%s|", provider.Url)
		}
		if provider.Temperature != nil {
			keyBuilder += fmt.Sprintf("temp:%.2f|", *provider.Temperature)
		}
		if provider.MaxTokens != nil {
			keyBuilder += fmt.Sprintf("maxtokens:%d|", *provider.MaxTokens)
		}
	}

	keyBuilder += fmt.Sprintf("conn:%d|", req.ConnectionId)
	if req.Database != nil {
		keyBuilder += fmt.Sprintf("db:%s|", *req.Database)
	}
	if req.Schema != nil {
		keyBuilder += fmt.Sprintf("schema:%s|", *req.Schema)
	}

	keyBuilder += fmt.Sprintf("prompt:%s|", req.Prompt)
	if req.Suffix != nil {
		keyBuilder += fmt.Sprintf("suffix:%s|", *req.Suffix)
	}
	if req.Language != nil {
		keyBuilder += fmt.Sprintf("lang:%s|", *req.Language)
	}

	hash := sha1.Sum([]byte(keyBuilder))
	return fmt.Sprintf("ai_complete:%x", hash)
}

func GetDefaultChatTTL() time.Duration {
	return 5 * time.Minute
}

func GetDefaultCompletionTTL() time.Duration {
	return 1 * time.Minute
}
