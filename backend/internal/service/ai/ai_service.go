package serviceAi

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceAiCache "github.com/dbo-studio/dbo/internal/service/ai/cache"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/samber/lo"
)

type IAiService interface {
	Chat(ctx context.Context, req *dto.AiChatRequest) (*dto.AiChatResponse, error)
	Complete(ctx context.Context, req *dto.AiInlineCompleteRequest) (*dto.AiInlineCompleteResponse, error)
}

type AiServiceImpl struct {
	connectionRepo  repository.IConnectionRepo
	aiProviderRepo  repository.IAiProviderRepo
	aiChatRepo      repository.IAiChatRepo
	cm              *databaseConnection.ConnectionManager
	logger          logger.Logger
	cacheManager    serviceAiCache.ICacheManager
	providerFactory *serviceAiProvider.ProviderFactory
}

func NewAiService(
	connectionRepo repository.IConnectionRepo,
	aiProviderRepo repository.IAiProviderRepo,
	aiChatRepo repository.IAiChatRepo,
	cm *databaseConnection.ConnectionManager,
	cache cache.Cache,
) IAiService {
	return &AiServiceImpl{
		connectionRepo:  connectionRepo,
		aiProviderRepo:  aiProviderRepo,
		aiChatRepo:      aiChatRepo,
		cm:              cm,
		cacheManager:    serviceAiCache.NewCacheManager(cache),
		providerFactory: serviceAiProvider.NewProviderFactory(),
	}
}

func (s *AiServiceImpl) Chat(ctx context.Context, req *dto.AiChatRequest) (*dto.AiChatResponse, error) {
	aiProvider, dbProvider, err := s.createProvider(ctx, uint(req.ProviderId))
	if err != nil {
		return nil, err
	}

	chat, err := s.findChat(ctx, req)
	if err != nil {
		return nil, err
	}

	conn, err := s.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(conn, s.cm)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	contextStr, err := repo.AiContext(req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	chat.Messages = append(chat.Messages, model.AiChatMessage{
		Role:    model.AiChatMessageRoleUser,
		Content: req.Message,
	})

	providerReq := &serviceAiProvider.ChatRequest{
		Messages:    chat.Messages,
		Model:       req.Model,
		Temperature: dbProvider.Temperature,
		MaxTokens:   dbProvider.MaxTokens,
		Context:     contextStr,
		Query:       lo.FromPtr(req.ContextOpts.Query),
	}

	providerResp, err := aiProvider.Chat(ctx, providerReq)
	if err != nil {
		return nil, err
	}

	if err := s.saveChatMessages(ctx, chat, req.Message, providerResp); err != nil {
		s.logger.Error(fmt.Sprintf("Failed to save chat messages: %v", err))
	}

	response := &dto.AiChatResponse{
		ChatId: chat.ID,
	}

	// response.Messages = append(response.Messages, dto.AiMessage{
	// 	Role:      string(model.AiChatMessageRoleUser),
	// 	Content:   req.Message,
	// 	Type:      string(model.AiChatMessageTypeExplanation),
	// 	Language:  string(model.AiChatMessageLanguageText),
	// 	CreatedAt: time.Now().Format("2006-01-02 15:04:05"),
	// })

	if len(providerResp.Contents) == 0 {
		response.Messages = append(response.Messages, dto.AiMessage{
			Role:      string(providerResp.Role),
			Content:   providerResp.Content,
			Type:      string(providerResp.Type),
			Language:  string(providerResp.Language),
			CreatedAt: time.Now().Format("2006-01-02 15:04:05"),
		})
	}

	for _, content := range providerResp.Contents {
		response.Messages = append(response.Messages, dto.AiMessage{
			Role:      string(providerResp.Role),
			Content:   content.Content,
			Type:      string(content.Type),
			Language:  string(content.Language),
			CreatedAt: time.Now().Format("2006-01-02 15:04:05"),
		})
	}

	return response, nil
}

func (s *AiServiceImpl) Complete(ctx context.Context, req *dto.AiInlineCompleteRequest) (*dto.AiInlineCompleteResponse, error) {
	// aiProvider, dbProvider, err := s.createProvider(ctx, req.ProviderId)
	// if err != nil {
	// 	return nil, apperror.InternalServerError(err)
	// }

	// cacheKey := s.cacheManager.GenerateCompletionKey(req, dbProvider)
	// if cachedResponse, found := s.cacheManager.GetCompletionResponse(cacheKey); found {
	// 	s.logger.Info("AI Complete ← cache hit")
	// 	return cachedResponse, nil
	// }

	// conn, err := s.connectionRepo.Find(ctx, req.ConnectionId)
	// if err != nil {
	// 	return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	// }

	// repo, err := database.NewDatabaseRepository(conn, s.cm)
	// if err != nil {
	// 	return nil, apperror.InternalServerError(err)
	// }

	// contextStr, _ := s.buildContextFromAutocomplete(repo, req.ConnectionId, req.Database, req.Schema)

	// s.logCompletionRequest(req, contextStr)

	// providerReq := &provider.CompletionRequest{
	// 	Prompt:      req.Prompt,
	// 	Suffix:      req.Suffix,
	// 	Language:    req.Language,
	// 	Model:       req.Model,
	// 	Temperature: dbProvider.Temperature,
	// 	MaxTokens:   dbProvider.MaxTokens,
	// 	Context:     contextStr,
	// }

	// providerResp, err := aiProvider.Complete(ctx, providerReq)
	// if err != nil {
	// 	s.logger.Error(fmt.Sprintf("AI Complete error: %v", err))
	// 	return nil, err
	// }

	// response := &dto.AiInlineCompleteResponse{
	// 	Completion: providerResp.Completion,
	// }

	// s.logCompletionResponse(response)

	// s.cacheManager.SetCompletionResponse(cacheKey, response, aiCache.GetDefaultCompletionTTL())

	return nil, nil
}
