package serviceAi

import (
	"crypto/sha1"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
)

func (cm *AiServiceImpl) getCompletionResponse(key string) (*dto.AiInlineCompleteResponse, bool) {
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

func (cm *AiServiceImpl) setCompletionResponse(key string, response *dto.AiInlineCompleteResponse, ttl time.Duration) error {
	return cm.cache.Set(key, response, &ttl)
}

func (cm *AiServiceImpl) generateCompletionKey(req *dto.AiInlineCompleteRequest, provider *model.AiProvider) string {
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

	if req.ContextOpts.Database != nil {
		keyBuilder += fmt.Sprintf("db:%s|", *req.ContextOpts.Database)
	}
	if req.ContextOpts.Schema != nil {
		keyBuilder += fmt.Sprintf("schema:%s|", *req.ContextOpts.Schema)
	}

	keyBuilder += fmt.Sprintf("prompt:%s|", req.ContextOpts.Prompt)
	if req.ContextOpts.Suffix != nil {
		keyBuilder += fmt.Sprintf("suffix:%s|", *req.ContextOpts.Suffix)
	}

	hash := sha1.Sum([]byte(keyBuilder))
	return fmt.Sprintf("ai_complete:%x", hash)
}
