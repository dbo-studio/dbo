package serviceAi

import (
	"context"
	"errors"
	"slices"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	aiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
)

// createProvider uses the active provider, or the provider/model named by req when it overrides them.
func (s *AiServiceImpl) createProvider(ctx context.Context, req *dto.AiChatRequest) (aiProvider.IAiProvider, *model.AiProvider, error) {
	dbProvider, err := s.resolveProvider(ctx, req)
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

func (s *AiServiceImpl) resolveProvider(ctx context.Context, req *dto.AiChatRequest) (*model.AiProvider, error) {
	if req == nil || (req.ProviderID == nil && req.Model == "") {
		return s.resolveActiveProvider(ctx)
	}

	var (
		dbProvider *model.AiProvider
		err        error
	)

	if req.ProviderID != nil {
		dbProvider, err = s.aiProviderRepo.Find(ctx, *req.ProviderID)
	} else {
		dbProvider, err = s.aiProviderRepo.FindActive(ctx)
	}

	if err != nil {
		return nil, apperror.BadRequest(apperror.ErrAiNotConfigured)
	}

	if req.Model != "" && req.Model != dbProvider.Model {
		if !slices.Contains(dbProvider.Models, req.Model) {
			return nil, apperror.BadRequest(apperror.ErrAiMissingModel)
		}

		// Work on a copy: the override must never leak into the stored provider.
		override := *dbProvider
		override.Model = req.Model
		dbProvider = &override
	}

	if err := providerReadinessError(dbProvider); err != nil {
		return nil, err
	}

	return dbProvider, nil
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
			Count: lo.ToPtr(historyFetchCount),
		})
		if err != nil {
			return nil, apperror.NotFound(apperror.ErrAiChatNotFound)
		}

		// A chat belongs to one connection; its history and tools must not run against another.
		if chat.ConnectionID != uint(req.ConnectionID) {
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

// historyFetchCount loads enough recent rows to still find historyTurnCount
// conversational messages when agent trace rows are interleaved.
const (
	historyFetchCount = 20
	historyTurnCount  = 5
)

// conversationHistory drops agent trace rows (tool/diagram/permission cards)
// and keeps the most recent conversational messages for the model.
func conversationHistory(messages []model.AiChatMessage) []model.AiChatMessage {
	history := lo.Filter(messages, func(m model.AiChatMessage, _ int) bool {
		return m.Type.IsConversational()
	})

	if len(history) > historyTurnCount {
		history = history[len(history)-historyTurnCount:]
	}

	return history
}

func (s *AiServiceImpl) saveChatMessages(ctx context.Context, chat *model.AiChat, userMessage string, traces []model.AiChatMessage, aiMessage *aiProvider.ChatResponse, modelName string) error {
	if err := s.aiChatRepo.AddMessage(ctx, &model.AiChatMessage{
		ChatID:   chat.ID,
		Role:     model.AiChatMessageRoleUser,
		Content:  userMessage,
		Type:     model.AiChatMessageTypeExplanation,
		Language: model.AiChatMessageLanguageText,
	}); err != nil {
		return err
	}

	for i := range traces {
		traces[i].ChatID = chat.ID
		traces[i].Model = modelName

		if err := s.aiChatRepo.AddMessage(ctx, &traces[i]); err != nil {
			return err
		}
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
				Model:    modelName,
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
		Model:    modelName,
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

// saveChatContext remembers the explorer context so reopening the chat restores its chips.
// Only names are stored; queries and results stay out of the app DB. Failures are non-fatal.
func (s *AiServiceImpl) saveChatContext(ctx context.Context, chatID uint, opts *dto.AiContextOptions) {
	if opts == nil {
		return
	}

	raw, err := json.Marshal(dto.AiContextOptions{
		Database: opts.Database,
		Schema:   opts.Schema,
		Tables:   opts.Tables,
		Views:    opts.Views,
	})
	if err != nil {
		return
	}

	_ = s.aiChatRepo.UpdateContext(ctx, chatID, string(raw))
}
