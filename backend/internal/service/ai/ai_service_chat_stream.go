package serviceAi

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	"github.com/dbo-studio/dbo/internal/model"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/dbo-studio/dbo/internal/service/dbtools"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/goccy/go-json"
)

func (s *AiServiceImpl) ChatStream(ctx context.Context, req *dto.AiChatRequest, emit func([]byte) error) error {
	emitEvent := func(event serviceAiProvider.StreamEvent) error {
		data, err := json.Marshal(event)
		if err != nil {
			return err
		}
		return emit(data)
	}

	provider, dbProvider, err := s.createProvider(ctx)
	if err != nil {
		return err
	}

	chat, err := s.findChat(ctx, req)
	if err != nil {
		return err
	}

	conn, err := s.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewAIContextRepository(ctx, conn, s.cm)
	if err != nil {
		return err
	}

	if err := emitEvent(serviceAiProvider.StreamEvent{
		Type:  "status",
		Label: "Building schema context...",
	}); err != nil {
		return err
	}

	contextStr, err := repo.AiContext(ctx, req)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	if err := s.updateChatTitle(ctx, chat, req.Message); err != nil {
		return err
	}

	chat.Messages = append(chat.Messages, model.AiChatMessage{
		Role:    model.AiChatMessageRoleUser,
		Content: req.Message,
	})

	providerReq := buildProviderChatRequest(chat, dbProvider.Model, contextStr, req, true)
	providerReq.Tools = dbtools.ChatTools()

	if err := emitEvent(serviceAiProvider.StreamEvent{
		Type:  "status",
		Label: "Thinking...",
	}); err != nil {
		return err
	}

	providerResp, providerErr := s.runAgentLoop(ctx, provider, providerReq, req, emitEvent)

	if saveErr := s.saveChatMessages(ctx, chat, req.Message, providerResp); saveErr != nil {
		s.logger.Error(fmt.Sprintf("Failed to save chat messages: %v", saveErr))
	}

	if providerErr != nil {
		errPayload, marshalErr := json.Marshal(map[string]string{
			"type":    "error",
			"message": providerErr.Error(),
		})
		if marshalErr != nil {
			return marshalErr
		}
		if emitErr := emit(errPayload); emitErr != nil {
			return emitErr
		}
		return providerErr
	}

	response := &dto.AiChatResponse{
		ChatID: chat.ID,
		Title:  chat.Title,
	}

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

	donePayload, err := json.Marshal(map[string]any{
		"type":     "done",
		"chatId":   response.ChatID,
		"title":    response.Title,
		"messages": response.Messages,
	})
	if err != nil {
		return err
	}

	return emit(donePayload)
}
