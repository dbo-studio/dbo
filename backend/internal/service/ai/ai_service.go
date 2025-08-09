package serviceAI

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"crypto/sha1"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
)

type IAIService interface {
	Chat(ctx context.Context, req *dto.AIChatRequest) (*dto.AIChatResponse, error)
	Complete(ctx context.Context, req *dto.AIInlineCompleteRequest) (*dto.AIInlineCompleteResponse, error)
}

type AIServiceImpl struct {
	connectionRepo repository.IConnectionRepo
	cm             *databaseConnection.ConnectionManager
	logger         logger.Logger
	cache          cache.Cache
	aiRepo         repository.IAiRepo
}

func NewAIService(
	connectionRepo repository.IConnectionRepo,
	cm *databaseConnection.ConnectionManager,
	logger logger.Logger,
	aiRepo repository.IAiRepo,
	cache cache.Cache,
) IAIService {
	return &AIServiceImpl{
		connectionRepo: connectionRepo,
		cm:             cm,
		logger:         logger,
		cache:          cache,
		aiRepo:         aiRepo,
	}
}

func (s *AIServiceImpl) Chat(ctx context.Context, req *dto.AIChatRequest) (*dto.AIChatResponse, error) {
	conn, err := s.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}
	repo, err := database.NewDatabaseRepository(conn, s.cm)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	// Build lightweight context from autocomplete
	contextStr, _ := buildContextFromAutocomplete(repo, req.ConnectionId, req.Database, req.Schema)

	// Call provider (OpenAI-compatible minimal)
	prov := normalizeProvider(req.Provider)
	s.logger.Info(fmt.Sprintf("AI Chat → provider=%s model=%s baseUrl=%s msgs=%d ctxLen=%d", prov.ProviderId, prov.Model, safeBaseURL(prov.BaseUrl), len(req.Messages), len(contextStr)))
	if len(req.Messages) > 0 {
		last := req.Messages[len(req.Messages)-1].Content
		if len(last) > 120 {
			last = last[:120] + "…"
		}
		s.logger.Info(fmt.Sprintf("AI Chat lastMsg: %q", last))
	}
	payload := map[string]any{
		"model":       prov.Model,
		"temperature": valueOr(prov.Temperature, 0.2),
		"max_tokens":  valueOr(prov.MaxTokens, 512),
		"messages":    append([]map[string]string{{"role": "system", "content": fmt.Sprintf("Context:\n%s", contextStr)}}, toOpenAI(req.Messages)...),
	}
	body, _ := json.Marshal(payload)
	httpReq, _ := http.NewRequestWithContext(ctx, http.MethodPost, baseURL(prov)+"/chat/completions", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")
	if prov.ApiKey != nil && *prov.ApiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+*prov.ApiKey)
	}
	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		s.logger.Error(fmt.Sprintf("AI Chat http error: %v", err))
		return nil, apperror.InternalServerError(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		s.logger.Error(fmt.Sprintf("AI Chat bad status: %s", resp.Status))
		return nil, apperror.InternalServerError(fmt.Errorf("ai error: %s", resp.Status))
	}
	var out struct {
		Choices []struct {
			Message struct{ Role, Content string }
		}
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, apperror.InternalServerError(err)
	}
	if len(out.Choices) == 0 {
		return &dto.AIChatResponse{Message: dto.AIMessage{Role: "assistant", Content: ""}}, nil
	}
	content := out.Choices[0].Message.Content
	preview := content
	if len(preview) > 120 {
		preview = preview[:120] + "…"
	}
	s.logger.Info(fmt.Sprintf("AI Chat ← len=%d preview=%q", len(content), preview))
	return &dto.AIChatResponse{Message: dto.AIMessage{Role: out.Choices[0].Message.Role, Content: content}}, nil
}

func (s *AIServiceImpl) Complete(ctx context.Context, req *dto.AIInlineCompleteRequest) (*dto.AIInlineCompleteResponse, error) {
	conn, err := s.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}
	repo, err := database.NewDatabaseRepository(conn, s.cm)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	contextStr, _ := buildContextFromAutocomplete(repo, req.ConnectionId, req.Database, req.Schema)
	prov := normalizeProvider(req.Provider)
	// try /completions
	prompt := buildCompletionPrompt(req.Prompt, req.Suffix, req.Language, contextStr)
	suffixLen := 0
	if req.Suffix != nil {
		suffixLen = len(*req.Suffix)
	}
	s.logger.Info(fmt.Sprintf("AI Complete → provider=%s model=%s baseUrl=%s prefixLen=%d suffixLen=%d ctxLen=%d", prov.ProviderId, prov.Model, safeBaseURL(prov.BaseUrl), len(req.Prompt), suffixLen, len(contextStr)))
	if comp, ok := callCompletions(ctx, prov, prompt); ok {
		prev := comp
		if len(prev) > 120 {
			prev = prev[:120] + "…"
		}
		s.logger.Info(fmt.Sprintf("AI Complete ← (legacy) len=%d preview=%q", len(comp), prev))
		return &dto.AIInlineCompleteResponse{Completion: comp}, nil
	}
	// fallback /chat/completions with 1-minute cache
	cacheKey := s.cacheKey(req, prov)
	if v, ok := s.cache.Get(cacheKey); ok {
		if cached, ok2 := v.(string); ok2 {
			s.logger.Info("AI Complete ← cache hit")
			return &dto.AIInlineCompleteResponse{Completion: cached}, nil
		}
	}
	comp, err := callChatForCompletion(ctx, prov, prompt)
	if err != nil {
		s.logger.Error(fmt.Sprintf("AI Complete http error: %v", err))
		return nil, apperror.InternalServerError(err)
	}
	prev := comp
	if len(prev) > 120 {
		prev = prev[:120] + "…"
	}
	s.logger.Info(fmt.Sprintf("AI Complete ← len=%d preview=%q", len(comp), prev))
	s.cache.Set(cacheKey, comp, 1*time.Minute)
	return &dto.AIInlineCompleteResponse{Completion: comp}, nil
}

// buildContextFromAutocomplete builds a simple context string using available autocomplete metadata
func buildContextFromAutocomplete(repo databaseContract.DatabaseRepository, connectionId int32, databaseName *string, schemaName *string) (string, error) {
	ac, err := repo.AutoComplete(&dto.AutoCompleteRequest{ConnectionId: connectionId, Database: databaseName, Schema: schemaName, FromCache: false})
	if err != nil {
		return "", err
	}
	var sb strings.Builder
	if databaseName != nil {
		sb.WriteString("Database: ")
		sb.WriteString(*databaseName)
		sb.WriteString("\n")
	}
	if schemaName != nil {
		sb.WriteString("Schema: ")
		sb.WriteString(*schemaName)
		sb.WriteString("\n")
	}

	// Build a complete table->columns list. If schema is not specified, fetch per-schema columns.
	type tableKey struct{ schema, table string }
	colMap := make(map[tableKey][]string)

	if schemaName != nil {
		// رد کردن اسکیمه‌های سیستمی
		if isSystemSchema(*schemaName) {
			// هیچ چیز بازنگردان تا نویز نشود
			return "", nil
		}
		// Columns already present in ac.Columns keyed by table name
		for _, t := range ac.Tables {
			if isSystemRelation(t) {
				continue
			}
			if cols, ok := ac.Columns[t]; ok {
				colMap[tableKey{schema: *schemaName, table: t}] = cols
			} else {
				colMap[tableKey{schema: *schemaName, table: t}] = []string{}
			}
		}
	} else {
		// No schema specified → iterate schemas and fetch columns for each
		for _, sc := range ac.Schemas {
			if isSystemSchema(sc) {
				continue
			}
			scCopy := sc
			sub, err := repo.AutoComplete(&dto.AutoCompleteRequest{ConnectionId: connectionId, Database: databaseName, Schema: &scCopy, FromCache: false})
			if err != nil {
				continue
			}
			for _, t := range sub.Tables {
				if isSystemRelation(t) {
					continue
				}
				if cols, ok := sub.Columns[t]; ok {
					colMap[tableKey{schema: sc, table: t}] = cols
				} else {
					colMap[tableKey{schema: sc, table: t}] = []string{}
				}
			}
		}
	}

	if len(colMap) > 0 || len(ac.Tables) > 0 {
		sb.WriteString("Tables and columns:\n")
		if len(colMap) > 0 {
			for k, cols := range colMap {
				// print as schema.table when schema present
				name := k.table
				if k.schema != "" {
					name = k.schema + "." + k.table
				}
				sb.WriteString("- ")
				sb.WriteString(name)
				sb.WriteString(": ")
				if len(cols) > 0 {
					sb.WriteString(strings.Join(cols, ", "))
				}
				sb.WriteString("\n")
			}
		} else {
			// fallback: tables without columns
			for _, t := range ac.Tables {
				sb.WriteString("- ")
				sb.WriteString(t)
				sb.WriteString("\n")
			}
		}
	}
	if len(ac.Views) > 0 {
		// فیلتر ویوهای سیستمی
		filteredViews := make([]string, 0, len(ac.Views))
		for _, v := range ac.Views {
			if !isSystemRelation(v) {
				filteredViews = append(filteredViews, v)
			}
		}
		if len(filteredViews) > 0 {
			sb.WriteString("Views: ")
			sb.WriteString(strings.Join(filteredViews, ", "))
			sb.WriteString("\n")
		}
	}
	return sb.String(), nil
}

// فیلتر کردن اشیای سیستمی برای جلوگیری از ارسال نویز به مدل
func isSystemSchema(name string) bool {
	n := strings.ToLower(name)
	if n == "pg_catalog" || n == "information_schema" {
		return true
	}
	if strings.HasPrefix(n, "pg_") || strings.HasPrefix(n, "sqlite_") {
		return true
	}
	return false
}

func isSystemRelation(name string) bool {
	n := strings.ToLower(name)
	if strings.HasPrefix(n, "pg_") || strings.HasPrefix(n, "sqlite_") {
		return true
	}
	if n == "sqlite_master" || n == "sqlite_schema" || n == "sqlite_temp_schema" {
		return true
	}
	return false
}

// helpers
func valueOr[T any](p *T, d T) T {
	if p != nil {
		return *p
	}
	return d
}
func baseURL(p aiProv) string {
	if p.BaseUrl != nil && *p.BaseUrl != "" {
		return strings.TrimRight(*p.BaseUrl, "/")
	}
	return "https://api.openai.com/v1"
}

func safeBaseURL(u *string) string {
	if u == nil {
		return ""
	}
	return *u
}

func (s *AIServiceImpl) cacheKey(req *dto.AIInlineCompleteRequest, p aiProv) string {
	base := safeBaseURL(p.BaseUrl)
	lang := ""
	if req.Language != nil {
		lang = *req.Language
	}
	suf := ""
	if req.Suffix != nil {
		suf = *req.Suffix
	}
	sum := sha1.Sum([]byte(req.Prompt + "|" + suf + "|" + base + "|" + p.Model + "|" + lang))
	return fmt.Sprintf("ai_complete:%x", sum)
}

type aiProv struct {
	ProviderId  string
	BaseUrl     *string
	ApiKey      *string
	Model       string
	Temperature *float32
	MaxTokens   *int
}

func normalizeProvider(in *dto.AIProviderSettings) aiProv {
	if in == nil {
		return aiProv{ProviderId: "openai-compatible", Model: "gpt-3.5-turbo"}
	}
	return aiProv{ProviderId: in.ProviderId, BaseUrl: in.BaseUrl, ApiKey: in.ApiKey, Model: in.Model, Temperature: in.Temperature, MaxTokens: in.MaxTokens}
}
func toOpenAI(msgs []dto.AIMessage) []map[string]string {
	res := make([]map[string]string, 0, len(msgs))
	for _, m := range msgs {
		res = append(res, map[string]string{"role": m.Role, "content": m.Content})
	}
	return res
}
func buildCompletionPrompt(prefix string, suffix *string, lang *string, ctxStr string) string {
	sb := strings.Builder{}
	sb.WriteString("You are a code autocomplete engine. Use the provided DB context when helpful.\n\n")
	if lang != nil && *lang != "" {
		sb.WriteString("Language: " + *lang + "\n")
	}
	if ctxStr != "" {
		sb.WriteString("Context:\n" + ctxStr + "\n\n")
	}
	sb.WriteString("Prefix:\n" + prefix + "\n\n")
	if suffix != nil {
		sb.WriteString("Suffix:\n" + *suffix + "\n\n")
	}
	sb.WriteString("Continue the code only, no explanations.")
	return sb.String()
}
func callCompletions(ctx context.Context, p aiProv, prompt string) (string, bool) {
	payload := map[string]any{"model": p.Model, "prompt": prompt, "temperature": valueOr(p.Temperature, 0.2), "max_tokens": valueOr(p.MaxTokens, 128)}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, baseURL(p)+"/completions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if p.ApiKey != nil && *p.ApiKey != "" {
		req.Header.Set("Authorization", "Bearer "+*p.ApiKey)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", false
	}
	defer resp.Body.Close()
	var out struct{ Choices []struct{ Text string } }
	if json.NewDecoder(resp.Body).Decode(&out) != nil {
		return "", false
	}
	if len(out.Choices) == 0 {
		return "", false
	}
	return out.Choices[0].Text, true
}
func callChatForCompletion(ctx context.Context, p aiProv, prompt string) (string, error) {
	payload := map[string]any{"model": p.Model, "temperature": valueOr(p.Temperature, 0.2), "max_tokens": valueOr(p.MaxTokens, 128), "messages": []map[string]string{{"role": "system", "content": "Return only the continuation."}, {"role": "user", "content": prompt}}}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, baseURL(p)+"/chat/completions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if p.ApiKey != nil && *p.ApiKey != "" {
		req.Header.Set("Authorization", "Bearer "+*p.ApiKey)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("ai error: %s", resp.Status)
	}
	var out struct {
		Choices []struct{ Message struct{ Content string } }
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	if len(out.Choices) == 0 {
		return "", nil
	}
	return out.Choices[0].Message.Content, nil
}
