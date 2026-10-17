package serviceAiChat

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/goccy/go-json"
	"github.com/gofiber/fiber/v3/client"
	"github.com/samber/lo"
)

// feedbackWindow bounds how many recent messages are loaded to find the newest turn.
const feedbackWindow = 50

type aiFeedbackPayload struct {
	Rating     string `json:"rating"`
	Comment    string `json:"comment,omitempty"`
	Prompt     string `json:"prompt"`
	Answer     string `json:"answer"`
	Model      string `json:"model,omitempty"`
	AppVersion string `json:"app_version"`
	Client     string `json:"client"`
}

// Feedback sends the user's rating of the newest answer, with the question and
// answer, to the DBO website. Nothing is stored in the local database; the
// caller only gets here after the user chose to send it.
func (s IAiChatServiceImpl) Feedback(ctx context.Context, chatID uint, req *dto.AiChatFeedbackRequest) error {
	chat, err := s.aiChatRepo.Find(ctx, chatID, &dto.PaginationRequest{Page: lo.ToPtr(1), Count: lo.ToPtr(feedbackWindow)})
	if err != nil {
		return apperror.NotFound(apperror.ErrAiChatNotFound)
	}

	if err := s.requireConnection(ctx, int32(chat.ConnectionID)); err != nil {
		return apperror.NotFound(apperror.ErrAiChatNotFound)
	}

	payload, ok := s.newestTurn(chat.Messages)
	if !ok {
		return apperror.NotFound(apperror.ErrAiChatNotFound)
	}

	payload.Rating = req.Rating
	payload.Comment = strings.TrimSpace(req.Comment)
	payload.AppVersion = s.cfg.App.Version
	payload.Client = string(s.cfg.App.Client)

	return s.sendFeedback(ctx, payload)
}

// newestTurn returns the last question and the conversational answers after it.
func (s IAiChatServiceImpl) newestTurn(messages []model.AiChatMessage) (aiFeedbackPayload, bool) {
	var payload aiFeedbackPayload

	start := -1

	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].Role == model.AiChatMessageRoleUser {
			start = i

			break
		}
	}

	if start < 0 {
		return payload, false
	}

	payload.Prompt = messages[start].Content

	answers := make([]string, 0, len(messages)-start)

	for _, message := range messages[start+1:] {
		if message.Role != model.AiChatMessageRoleAssistant || !message.Type.IsConversational() {
			continue
		}

		answers = append(answers, message.Content)
		payload.Model = message.Model
	}

	if len(answers) == 0 {
		return payload, false
	}

	payload.Answer = strings.Join(answers, "\n\n")

	return payload, true
}

func (s IAiChatServiceImpl) sendFeedback(ctx context.Context, payload aiFeedbackPayload) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	cc := client.New()
	cc.SetTimeout(10 * time.Second)

	resp, err := cc.Post(s.cfg.App.FeedbackURLAPI, client.Config{
		Ctx:    ctx,
		Header: map[string]string{"Content-Type": "application/json", "Accept": "application/json"},
		Body:   body,
	})
	if err != nil {
		return apperror.InternalServerError(fmt.Errorf("could not reach the feedback server: %w", err))
	}
	defer resp.Close()

	if resp.StatusCode() < 200 || resp.StatusCode() >= 300 {
		return apperror.InternalServerError(errors.New("the feedback server rejected the feedback"))
	}

	return nil
}
