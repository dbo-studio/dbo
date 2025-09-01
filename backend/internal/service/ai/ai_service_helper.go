package serviceAi

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

func (s *AiServiceImpl) createProvider(ctx context.Context, providerId uint) (serviceAiProvider.IAiProvider, *model.AiProvider, error) {
	dbProvider, err := s.aiProviderRepo.Find(ctx, providerId)
	if err != nil {
		return nil, nil, apperror.NotFound(apperror.ErrAiProviderNotFound)
	}

	aiProvider, err := s.providerFactory.CreateProvider(dbProvider)
	if err != nil {
		return nil, nil, err
	}

	return aiProvider, dbProvider, nil
}

func (s *AiServiceImpl) findChat(ctx context.Context, req *dto.AiChatRequest) (*model.AiChat, error) {
	if req.ChatId != nil {
		chat, err := s.aiChatRepo.Find(ctx, uint(lo.FromPtr(req.ChatId)), &dto.PaginationRequest{
			Page:  lo.ToPtr(1),
			Count: lo.ToPtr(10),
		})
		if err != nil {
			return nil, apperror.NotFound(apperror.ErrAiChatNotFound)
		}

		chat.ProviderId = lo.ToPtr(uint(req.ProviderId))
		chat.Model = lo.ToPtr(req.Model)

		if err := s.aiChatRepo.Update(ctx, chat); err != nil {
			return nil, apperror.InternalServerError(err)
		}

		return chat, nil
	}

	chat, err := s.aiChatRepo.Create(ctx, &dto.AiChatCreateRequest{
		Title:        req.Message,
		ConnectionId: req.ConnectionId,
		ProviderId:   lo.ToPtr(req.ProviderId),
		Model:        lo.ToPtr(req.Model),
	})

	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return chat, nil
}

func (s *AiServiceImpl) saveChatMessages(ctx context.Context, chat *model.AiChat, userMessage string, aiMessage *serviceAiProvider.ChatResponse) error {
	if err := s.aiChatRepo.AddMessage(ctx, &model.AiChatMessage{
		ChatId:   chat.ID,
		Role:     model.AiChatMessageRoleUser,
		Content:  userMessage,
		Type:     model.AiChatMessageTypeExplanation,
		Language: model.AiChatMessageLanguageText,
	}); err != nil {
		return err
	}

	if len(aiMessage.Contents) > 0 {
		for _, content := range aiMessage.Contents {
			if err := s.aiChatRepo.AddMessage(ctx, &model.AiChatMessage{
				ChatId:   chat.ID,
				Role:     model.AiChatMessageRoleAssistant,
				Content:  content.Content,
				Type:     content.Type,
				Language: content.Language,
			}); err != nil {
				return err
			}
		}
		return nil
	}

	if err := s.aiChatRepo.AddMessage(ctx, &model.AiChatMessage{
		ChatId:   chat.ID,
		Role:     model.AiChatMessageRoleAssistant,
		Content:  aiMessage.Content,
		Type:     aiMessage.Type,
		Language: aiMessage.Language,
	}); err != nil {
		return err
	}

	return nil
}

func (s *AiServiceImpl) updateChatTitle(ctx context.Context, chat *model.AiChat, userMessage string) error {
	if len(chat.Messages) == 0 {
		title := userMessage
		if len(userMessage) > 20 {
			title = userMessage[0:20]
		}

		chat.Title = title
		if err := s.aiChatRepo.Update(ctx, chat); err != nil {
			return err
		}
	}

	return nil
}
