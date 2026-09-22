package serviceAi

import (
	"context"
	"errors"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	aiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

func (s *AiServiceImpl) createProvider(ctx context.Context) (aiProvider.IAiProvider, *model.AiProvider, error) {
	dbProvider, err := s.resolveActiveProvider(ctx)
	if err != nil {
		return nil, nil, err
	}

	client, err := s.providerFactory.CreateProvider(ctx, dbProvider)
	if err != nil {
		if readyErr := providerReadinessError(dbProvider); readyErr != nil {
			return nil, nil, readyErr
		}

		return nil, nil, apperror.BadRequest(apperror.ErrProviderNotConfigured)
	}

	return client, dbProvider, nil
}

func (s *AiServiceImpl) resolveActiveProvider(ctx context.Context) (*model.AiProvider, error) {
	dbProvider, err := s.aiProviderRepo.FindActive(ctx)
	if err != nil {
		return nil, apperror.BadRequest(apperror.ErrAiNotConfigured)
	}

	if err := providerReadinessError(dbProvider); err != nil {
		return nil, err
	}

	return dbProvider, nil
}

func providerReadinessError(provider *model.AiProvider) error {
	if provider.URL == "" {
		return apperror.BadRequest(apperror.ErrAiMissingURL)
	}

	if provider.Model == "" {
		return apperror.BadRequest(apperror.ErrAiMissingModel)
	}

	if provider.Type != model.AIProviderTypeOllama && (provider.APIKey == nil || *provider.APIKey == "") {
		return apperror.BadRequest(apperror.ErrAiMissingKey)
	}

	return nil
}

func isRequestCanceled(ctx context.Context, err error) bool {
	if ctx.Err() != nil {
		return true
	}

	if err == nil {
		return false
	}

	return errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded)
}

func (s *AiServiceImpl) findChat(ctx context.Context, req *dto.AiChatRequest) (*model.AiChat, error) {
	if req.ChatID != nil {
		chat, err := s.aiChatRepo.Find(ctx, uint(lo.FromPtr(req.ChatID)), &dto.PaginationRequest{
			Page:  lo.ToPtr(1),
			Count: lo.ToPtr(5),
		})
		if err != nil {
			return nil, apperror.NotFound(apperror.ErrAiChatNotFound)
		}

		if err := s.aiChatRepo.Update(ctx, chat); err != nil {
			return nil, apperror.InternalServerError(err)
		}

		return chat, nil
	}

	chat, err := s.aiChatRepo.Create(ctx, &dto.AiChatCreateRequest{
		Title:        req.Message,
		ConnectionID: req.ConnectionID,
	})
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return chat, nil
}

func (s *AiServiceImpl) saveChatMessages(ctx context.Context, chat *model.AiChat, userMessage string, aiMessage *aiProvider.ChatResponse) error {
	if err := s.aiChatRepo.AddMessage(ctx, &model.AiChatMessage{
		ChatID:   chat.ID,
		Role:     model.AiChatMessageRoleUser,
		Content:  userMessage,
		Type:     model.AiChatMessageTypeExplanation,
		Language: model.AiChatMessageLanguageText,
	}); err != nil {
		return err
	}

	if aiMessage == nil {
		return nil
	}

	if len(aiMessage.Contents) > 0 {
		for _, content := range aiMessage.Contents {
			if err := s.aiChatRepo.AddMessage(ctx, &model.AiChatMessage{
				ChatID:   chat.ID,
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
		ChatID:   chat.ID,
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
