package serviceAi

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceAiCache "github.com/dbo-studio/dbo/internal/service/ai/cache"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
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

func NewAIService(
	connectionRepo repository.IConnectionRepo,
	aiProviderRepo repository.IAiProviderRepo,
	aiChatRepo repository.IAiChatRepo,
	cm *databaseConnection.ConnectionManager,
	logger logger.Logger,
	cache cache.Cache,
) IAiService {
	return &AiServiceImpl{
		connectionRepo:  connectionRepo,
		aiProviderRepo:  aiProviderRepo,
		aiChatRepo:      aiChatRepo,
		cm:              cm,
		logger:          logger,
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

	contextStr, _ := s.buildContextFromAutocomplete(repo, req)

	providerReq := &serviceAiProvider.ChatRequest{
		Messages:    chat.Messages,
		Model:       req.Model,
		Temperature: dbProvider.Temperature,
		MaxTokens:   dbProvider.MaxTokens,
		Context:     contextStr,
	}

	providerResp, err := aiProvider.Chat(ctx, providerReq)
	if err != nil {
		s.logger.Error(fmt.Sprintf("AI Chat error: %v", err))
		return nil, err
	}

	// if err := s.saveChatMessages(ctx, chat.ID, chat.Messages, providerResp.Message); err != nil {
	// 	s.logger.Error(fmt.Sprintf("Failed to save chat messages: %v", err))
	// }

	response := &dto.AiChatResponse{
		ChatId:  chat.ID,
		Message: providerResp.Message,
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
