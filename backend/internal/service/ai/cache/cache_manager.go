package cache

import (
	"crypto/sha1"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/samber/lo"
)

// ICacheManager interface برای مدیریت cache
type ICacheManager interface {
	// GetChatResponse دریافت پاسخ چت از cache
	GetChatResponse(key string) (*dto.AiChatResponse, bool)
	// SetChatResponse ذخیره پاسخ چت در cache
	SetChatResponse(key string, response *dto.AiChatResponse, ttl time.Duration)
	// GetCompletionResponse دریافت پاسخ completion از cache
	GetCompletionResponse(key string) (*dto.AiInlineCompleteResponse, bool)
	// SetCompletionResponse ذخیره پاسخ completion در cache
	SetCompletionResponse(key string, response *dto.AiInlineCompleteResponse, ttl time.Duration)
	// GenerateChatKey تولید کلید cache برای چت
	GenerateChatKey(req *dto.AiChatRequest, provider *model.AiProvider) string
	// GenerateCompletionKey تولید کلید cache برای completion
	GenerateCompletionKey(req *dto.AiInlineCompleteRequest, provider *model.AiProvider) string
}

// CacheManager پیاده‌سازی cache manager
type CacheManager struct {
	cache cache.Cache
}

// NewCacheManager ایجاد cache manager جدید
func NewCacheManager(c cache.Cache) ICacheManager {
	return &CacheManager{
		cache: c,
	}
}

// GetChatResponse دریافت پاسخ چت از cache
func (cm *CacheManager) GetChatResponse(key string) (*dto.AiChatResponse, bool) {
	var response dto.AiChatResponse
	if err := cm.cache.Get(key, &response); err == nil {
		return &response, true
	}
	return nil, false
}

// SetChatResponse ذخیره پاسخ چت در cache
func (cm *CacheManager) SetChatResponse(key string, response *dto.AiChatResponse, ttl time.Duration) {
	cm.cache.Set(key, response, &ttl)
}

// GetCompletionResponse دریافت پاسخ completion از cache
func (cm *CacheManager) GetCompletionResponse(key string) (*dto.AiInlineCompleteResponse, bool) {
	var response dto.AiInlineCompleteResponse
	if err := cm.cache.Get(key, &response); err == nil {
		return &response, true
	}

	// برای سازگاری با کد قبلی که string ذخیره می‌کرد
	var str string
	if err := cm.cache.Get(key, &str); err == nil {
		return &dto.AiInlineCompleteResponse{Completion: str}, true
	}

	return nil, false
}

// SetCompletionResponse ذخیره پاسخ completion در cache
func (cm *CacheManager) SetCompletionResponse(key string, response *dto.AiInlineCompleteResponse, ttl time.Duration) {
	cm.cache.Set(key, response, &ttl)
}

// GenerateChatKey تولید کلید cache برای چت
func (cm *CacheManager) GenerateChatKey(req *dto.AiChatRequest, provider *model.AiProvider) string {
	// ساخت string منحصر به فرد از پارامترهای درخواست
	var keyBuilder string

	// اضافه کردن اطلاعات provider
	if provider != nil {
		keyBuilder += fmt.Sprintf("provider:%d|model:%s|", provider.ID, provider.Model)
		if provider.Url != nil {
			keyBuilder += fmt.Sprintf("baseurl:%s|", provider.Url)
		}
		if provider.Temperature != nil {
			keyBuilder += fmt.Sprintf("temp:%.2f|", *provider.Temperature)
		}
		if provider.MaxTokens != nil {
			keyBuilder += fmt.Sprintf("maxtokens:%d|", *provider.MaxTokens)
		}
	}

	// اضافه کردن connection و database info
	keyBuilder += fmt.Sprintf("conn:%d|", req.ConnectionId)
	if req.Database != nil {
		keyBuilder += fmt.Sprintf("db:%s|", *req.Database)
	}
	if req.Schema != nil {
		keyBuilder += fmt.Sprintf("schema:%s|", *req.Schema)
	}

	// اضافه کردن پیام‌ها (فقط چند پیام آخر برای کارایی بهتر)
	msgCount := len(req.Messages)
	startIdx := 0
	if msgCount > 5 { // فقط 5 پیام آخر
		startIdx = msgCount - 5
	}

	for i := startIdx; i < msgCount; i++ {
		keyBuilder += fmt.Sprintf("msg%d:%s:%s|", i, req.Messages[i].Role, req.Messages[i].Content)
	}

	// تولید hash
	hash := sha1.Sum([]byte(keyBuilder))
	return fmt.Sprintf("ai_chat:%x", hash)
}

// GenerateCompletionKey تولید کلید cache برای completion
func (cm *CacheManager) GenerateCompletionKey(req *dto.AiInlineCompleteRequest, provider *model.AiProvider) string {
	var keyBuilder string

	// اضافه کردن اطلاعات provider
	if provider != nil {
		keyBuilder += fmt.Sprintf("provider:%d|model:%s|", provider.ID, lo.FromPtr(provider.Model))
		if provider.Url != nil {
			keyBuilder += fmt.Sprintf("baseurl:%s|", lo.FromPtr(provider.Url))
		}
		if provider.Temperature != nil {
			keyBuilder += fmt.Sprintf("temp:%.2f|", *provider.Temperature)
		}
		if provider.MaxTokens != nil {
			keyBuilder += fmt.Sprintf("maxtokens:%d|", *provider.MaxTokens)
		}
	}

	// اضافه کردن connection و database info
	keyBuilder += fmt.Sprintf("conn:%d|", req.ConnectionId)
	if req.Database != nil {
		keyBuilder += fmt.Sprintf("db:%s|", *req.Database)
	}
	if req.Schema != nil {
		keyBuilder += fmt.Sprintf("schema:%s|", *req.Schema)
	}

	// اضافه کردن اطلاعات completion
	keyBuilder += fmt.Sprintf("prompt:%s|", req.Prompt)
	if req.Suffix != nil {
		keyBuilder += fmt.Sprintf("suffix:%s|", *req.Suffix)
	}
	if req.Language != nil {
		keyBuilder += fmt.Sprintf("lang:%s|", *req.Language)
	}

	// تولید hash
	hash := sha1.Sum([]byte(keyBuilder))
	return fmt.Sprintf("ai_complete:%x", hash)
}

// GetDefaultChatTTL TTL پیش‌فرض برای cache چت
func GetDefaultChatTTL() time.Duration {
	return 5 * time.Minute // چت‌ها کمتر cache می‌شوند
}

func GetDefaultCompletionTTL() time.Duration {
	return 1 * time.Minute // completion‌ها سریع expire می‌شوند
}
