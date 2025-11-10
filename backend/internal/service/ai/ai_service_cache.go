package serviceAi

import (
	"context"
	"crypto/sha1"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

func (cm *AiServiceImpl) getCompletionResponse(ctx context.Context, key string) (*dto.AiInlineCompleteResponse, bool) {
	var response *dto.AiInlineCompleteResponse
	err := cm.cache.Get(ctx, key, &response)
	if err != nil {
		return nil, false
	}

	if response == nil {
		return nil, false
	}

	return response, true
}

func (cm *AiServiceImpl) setCompletionResponse(ctx context.Context, key string, response *dto.AiInlineCompleteResponse, ttl time.Duration) error {
	return cm.cache.Set(ctx, key, response, &ttl)
}

func (cm *AiServiceImpl) generateCompletionKey(req *dto.AiInlineCompleteRequest) string {
	var keyBuilder string

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
