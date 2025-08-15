package serviceAi

import (
	"context"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

func (s *AiServiceImpl) buildContextFromAutocomplete(repo databaseContract.DatabaseRepository, req *dto.AiChatRequest) (string, error) {
	var sb strings.Builder

	for _, db := range req.ContextOpts.Databases {
		sb.WriteString("Databases: ")
		sb.WriteString(db)
		sb.WriteString(", ")
		sb.WriteString("\n")
	}

	for _, schema := range req.ContextOpts.Schemas {
		sb.WriteString("Schemas: ")
		sb.WriteString(schema)
		sb.WriteString(", ")
		sb.WriteString("\n")
	}

	for _, view := range req.ContextOpts.Views {
		sb.WriteString("Views: ")
		sb.WriteString(view)
		sb.WriteString(", ")
		sb.WriteString("\n")
	}

	for _, schema := range req.ContextOpts.Schemas {
		ac, err := repo.AutoComplete(&dto.AutoCompleteRequest{
			ConnectionId: req.ConnectionId,
			FromCache:    true,
			Schema:       &schema,
			SkipSystem:   lo.ToPtr(true),
		})
		if err != nil {
			return "", err
		}

		for _, table := range req.ContextOpts.Tables {
			sb.WriteString("Tables and columns:\n")
			if len(ac.Columns) > 0 {
				for acTable, cols := range ac.Columns {
					if acTable != table {
						continue
					}

					sb.WriteString("- ")
					sb.WriteString(table)
					sb.WriteString(": ")
					if len(cols) > 0 {
						sb.WriteString(strings.Join(cols, ", "))
					}
					sb.WriteString("\n")
				}
			} else {
				for _, t := range ac.Tables {
					sb.WriteString("- ")
					sb.WriteString(t)
					sb.WriteString("\n")
				}
			}
		}
	}

	return sb.String(), nil
}

func (s *AiServiceImpl) createProvider(ctx context.Context, providerId uint) (serviceAiProvider.IAIProvider, *model.AiProvider, error) {
	dbProvider, err := s.aiProviderRepo.Find(ctx, providerId)
	if err != nil {
		return nil, nil, apperror.NotFound(apperror.ErrAiProviderNotFound)
	}

	aiProvider, err := s.providerFactory.CreateProvider(dbProvider)
	if err != nil {
		return nil, nil, err
	}

	if dbProvider.ApiKey == nil || *dbProvider.ApiKey == "" || dbProvider.Url == nil || *dbProvider.Url == "" {
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
		Title:        req.Message[:20],
		ConnectionId: req.ConnectionId,
	})

	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return chat, nil
}

func (s *AiServiceImpl) saveChatMessages(ctx context.Context, chatId uint, userMessages []dto.AiMessage, aiResponse dto.AiMessage) error {
	for _, msg := range userMessages {
		chatMessage := &model.AiChatMessage{
			ChatId:  chatId,
			Role:    msg.Role,
			Content: msg.Content,
		}
		if err := s.aiChatRepo.AddMessage(ctx, chatMessage); err != nil {
			return fmt.Errorf("failed to save user message: %w", err)
		}
	}

	aiMessage := &model.AiChatMessage{
		ChatId:  chatId,
		Role:    aiResponse.Role,
		Content: aiResponse.Content,
	}
	if err := s.aiChatRepo.AddMessage(ctx, aiMessage); err != nil {
		return fmt.Errorf("failed to save AI response: %w", err)
	}

	return nil
}
