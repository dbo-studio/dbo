package serviceAi

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

func (s *AiServiceImpl) createProvider(ctx context.Context, providerId uint) (serviceAiProvider.IAIProvider, *model.AiProvider, error) {
	dbProvider, err := s.aiProviderRepo.Find(ctx, providerId)
	if err != nil {
		return nil, nil, apperror.NotFound(apperror.ErrAiProviderNotFound)
	}

	aiProvider, err := s.providerFactory.CreateProvider(dbProvider)
	if err != nil {
		return nil, nil, err
	}

	if dbProvider.ApiKey == nil || *dbProvider.ApiKey == "" || dbProvider.Url == "" {
		return nil, nil, apperror.BadRequest(apperror.ErrProviderNotConfigured)
	}

	return aiProvider, dbProvider, nil
}

func (s *AiServiceImpl) findChat(ctx context.Context, req *dto.AiChatRequest) (*model.AiChat, error) {
	if req.ChatId != nil {
		chat, err := s.aiChatRepo.Find(ctx, uint(lo.FromPtr(req.ChatId)))
		if err != nil {
			return nil, apperror.NotFound(apperror.ErrAiChatNotFound)
		}
		return chat, nil
	}

	chat, err := s.aiChatRepo.Create(ctx, &dto.AiChatCreateRequest{
		Title:        req.Message,
		ConnectionId: req.ConnectionId,
	})

	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return chat, nil
}

func (s *AiServiceImpl) saveChatMessages(ctx context.Context, chat *model.AiChat, userMessage string, aiMessage string) error {
	if err := s.aiChatRepo.AddMessage(ctx, &model.AiChatMessage{
		ChatId:  chat.ID,
		Role:    model.AiChatMessageRoleUser,
		Content: userMessage,
	}); err != nil {
		return err
	}

	if err := s.aiChatRepo.AddMessage(ctx, &model.AiChatMessage{
		ChatId:  chat.ID,
		Role:    model.AiChatMessageRoleAssistant,
		Content: aiMessage,
	}); err != nil {
		return err
	}

	return nil
}
