package serviceConnector

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	serviceDashboard "github.com/dbo-studio/dbo/internal/service/dashboard"
	"github.com/dbo-studio/dbo/pkg/cryptoutil"
)

// Event is what a channel is told. It carries no paths or SQL, and the error text
// is included only when the channel opts in (includeError).
type Event struct {
	Kind       string // "backup" or "restore"
	Name       string // schedule or database label
	Connection string
	Database   string
	Failed     bool
	Missed     bool // the run never started: DBO was not running at its time
	Size       int64
	Error      string
	At         time.Time
	Test       bool
}

func (e Event) title() string {
	what := lo(e.Kind == "restore", "Restore", "Backup")

	switch {
	case e.Test:
		return "DBO test message"
	case e.Missed:
		return what + " missed"
	case e.Failed:
		return what + " failed"
	default:
		return what + " completed"
	}
}

func lo(cond bool, a, b string) string {
	if cond {
		return a
	}

	return b
}

func (e Event) text(includeError bool) string {
	if e.Test {
		return "This is a test message from DBO. Notifications are working."
	}

	parts := []string{e.title()}
	if e.Name != "" {
		parts = append(parts, e.Name)
	}

	if e.Connection != "" {
		parts = append(parts, e.Connection)
	}

	if e.Database != "" {
		parts = append(parts, e.Database)
	}

	if !e.Failed && e.Size > 0 {
		parts = append(parts, fmt.Sprintf("%.1f MB", float64(e.Size)/1024/1024))
	}

	text := strings.Join(parts, " · ")
	if e.Failed && includeError && e.Error != "" {
		text += "\n" + e.Error
	}

	return text
}

var errEmailNotConfigured = errors.New("outgoing email is not set up; add an SMTP account in the dashboard email settings first")

// send delivers the event on one channel.
func (s *service) send(ctx context.Context, connType string, f fields, e Event) error {
	includeError := f.flag("includeError")
	text := e.text(includeError)

	switch connType {
	case TypeEmail:
		return s.sendEmail(ctx, f, e, text)
	case TypeSlack:
		return s.post(ctx, f.secret("webhookUrl"), map[string]any{"text": text}, "")
	case TypeDiscord:
		return s.post(ctx, f.secret("webhookUrl"), map[string]any{"content": text}, "")
	case TypeTelegram:
		return s.post(ctx, "https://api.telegram.org/bot"+f.secret("botToken")+"/sendMessage", map[string]any{"chat_id": f.str("chatId"), "text": text}, "")
	case TypeWebhook:
		body := map[string]any{
			"event": lo(e.Failed, e.Kind+".failed", e.Kind+".completed"), "title": e.title(), "text": text,
			"name": e.Name, "connection": e.Connection, "database": e.Database, "size": e.Size, "at": e.At.UTC().Format(time.RFC3339),
		}
		if includeError {
			body["error"] = e.Error
		}

		return s.post(ctx, f.str("url"), body, f.secret("signingSecret"))
	default:
		return ErrUnknownType
	}
}

func (s *service) post(ctx context.Context, url string, body map[string]any, secret string) error {
	if !strings.HasPrefix(url, "https://") && !strings.HasPrefix(url, "http://") {
		return errMissingField("a webhook URL")
	}

	raw, _ := json.Marshal(body)

	return serviceDashboard.PostWebhook(ctx, url, raw, secret, "backup", s.allowInternal)
}

func (s *service) sendEmail(ctx context.Context, f fields, e Event, text string) error {
	to := splitList(f.str("recipients"))
	if len(to) == 0 {
		return errMissingField("recipients")
	}

	settings, err := s.dashboardRepo.GetSmtp(ctx)
	if err != nil || settings.Host == "" || settings.FromAddress == "" {
		return errEmailNotConfigured
	}

	password := ""
	if settings.PasswordEnc != "" {
		plain, err := cryptoutil.DecryptAESGCM(s.cipherKey, settings.PasswordEnc)
		if err != nil {
			return errors.New("the saved email password cannot be read; enter it again in the email settings")
		}

		password = string(plain)
	}

	cfg := serviceDashboard.SMTPConfig{
		Host: settings.Host, Port: settings.Port, Username: settings.Username, Password: password,
		From: settings.FromAddress, Security: settings.Security,
	}

	html := "<p>" + strings.ReplaceAll(htmlEscape(text), "\n", "<br>") + "</p>"

	return serviceDashboard.SendMail(cfg, to, e.title(), html)
}

func splitList(s string) []string {
	var out []string

	for _, p := range strings.FieldsFunc(s, func(r rune) bool { return r == ',' || r == ';' || r == '\n' || r == ' ' }) {
		if p != "" {
			out = append(out, p)
		}
	}

	return out
}

func htmlEscape(s string) string {
	return strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;").Replace(s)
}
