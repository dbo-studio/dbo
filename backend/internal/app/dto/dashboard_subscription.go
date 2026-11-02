package dto

import (
	"net/mail"
	"net/url"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/invopop/validation"
)

const maxSubscriptionRecipients = 20

type (
	// DashboardSubscriptionRequest is a schedule and where to send it; create and update share it.
	DashboardSubscriptionRequest struct {
		Kind string `json:"kind"`
		// Target is one or more comma-separated addresses for email, or a URL for a webhook.
		Target string `json:"target"`
		// Secret signs webhook bodies (HMAC-SHA256). Absent keeps the current one, empty removes it.
		Secret    *string `json:"secret"`
		Frequency string  `json:"frequency"`
		Hour      int     `json:"hour"`
		Minute    int     `json:"minute"`
		// Weekday is 0 (Sunday) to 6, used by weekly schedules.
		Weekday  int    `json:"weekday"`
		Timezone string `json:"timezone"`
		Enabled  *bool  `json:"enabled"`
	}

	DashboardSubscriptionResponse struct {
		ID                  uint       `json:"id"`
		Kind                string     `json:"kind"`
		Target              string     `json:"target"`
		HasSecret           bool       `json:"hasSecret"`
		Frequency           string     `json:"frequency"`
		Hour                int        `json:"hour"`
		Minute              int        `json:"minute"`
		Weekday             int        `json:"weekday"`
		Timezone            string     `json:"timezone"`
		Enabled             bool       `json:"enabled"`
		NextRunAt           time.Time  `json:"nextRunAt"`
		LastRunAt           *time.Time `json:"lastRunAt"`
		LastStatus          string     `json:"lastStatus"`
		LastError           string     `json:"lastError"`
		ConsecutiveFailures int        `json:"consecutiveFailures"`
	}

	DashboardSubscriptionListResponse struct {
		// EmailConfigured is false until an admin sets the outgoing mail account.
		EmailConfigured bool                            `json:"emailConfigured"`
		Items           []DashboardSubscriptionResponse `json:"items"`
	}

	DashboardSubscriptionRunResponse struct {
		ID         uint      `json:"id"`
		StartedAt  time.Time `json:"startedAt"`
		FinishedAt time.Time `json:"finishedAt"`
		Status     string    `json:"status"`
		Error      string    `json:"error"`
		Reports    int       `json:"reports"`
		Manual     bool      `json:"manual"`
	}

	SmtpSettingsRequest struct {
		Host        string `json:"host"`
		Port        int    `json:"port"`
		Username    string `json:"username"`
		Password    string `json:"password"`
		FromAddress string `json:"fromAddress"`
		Security    string `json:"security"`
	}

	SmtpSettingsResponse struct {
		Host        string `json:"host"`
		Port        int    `json:"port"`
		Username    string `json:"username"`
		HasPassword bool   `json:"hasPassword"`
		FromAddress string `json:"fromAddress"`
		Security    string `json:"security"`
		Configured  bool   `json:"configured"`
	}
)

// Recipients splits an email target into addresses.
func Recipients(target string) []string {
	var out []string

	for _, part := range strings.Split(target, ",") {
		if part = strings.TrimSpace(part); part != "" {
			out = append(out, part)
		}
	}

	return out
}

func validTarget(req DashboardSubscriptionRequest) error {
	switch req.Kind {
	case model.SubscriptionKindEmail:
		recipients := Recipients(req.Target)
		if len(recipients) == 0 || len(recipients) > maxSubscriptionRecipients {
			return validation.NewError("validation_target", "give between 1 and 20 email addresses")
		}

		for _, address := range recipients {
			if parsed, err := mail.ParseAddress(address); err != nil || parsed.Address != address {
				return validation.NewError("validation_target", address+" is not an email address")
			}
		}
	case model.SubscriptionKindWebhook:
		parsed, err := url.Parse(strings.TrimSpace(req.Target))
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
			return validation.NewError("validation_target", "the webhook must be an http or https URL")
		}
	}

	return nil
}

func (req DashboardSubscriptionRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Kind, validation.Required, validation.In(model.SubscriptionKindEmail, model.SubscriptionKindWebhook)),
		validation.Field(&req.Target, validation.Required, validation.Length(1, 2000), validation.By(func(any) error { return validTarget(req) })),
		validation.Field(&req.Frequency, validation.Required, validation.In(model.SubscriptionHourly, model.SubscriptionDaily, model.SubscriptionWeekly)),
		validation.Field(&req.Hour, validation.Min(0), validation.Max(23)),
		validation.Field(&req.Minute, validation.Min(0), validation.Max(59)),
		validation.Field(&req.Weekday, validation.Min(0), validation.Max(6)),
		validation.Field(&req.Timezone, validation.By(func(value any) error {
			name, _ := value.(string)
			if name == "" {
				return nil
			}

			if _, err := time.LoadLocation(name); err != nil {
				return validation.NewError("validation_timezone", "unknown time zone")
			}

			return nil
		})),
		validation.Field(&req.Secret, validation.By(func(value any) error {
			if secret, _ := value.(*string); secret != nil && len(*secret) > 200 {
				return validation.NewError("validation_length", "the secret is too long")
			}

			return nil
		})),
	)
}

func (req SmtpSettingsRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Host, validation.Required, validation.Length(1, 255)),
		validation.Field(&req.Port, validation.Required, validation.Min(1), validation.Max(65535)),
		validation.Field(&req.Username, validation.Length(0, 255)),
		validation.Field(&req.Password, validation.Length(0, 500)),
		validation.Field(&req.FromAddress, validation.Required, validation.By(func(value any) error {
			address, _ := value.(string)
			if parsed, err := mail.ParseAddress(address); err != nil || parsed.Address == "" {
				return validation.NewError("validation_from", "the from address is not valid")
			}

			return nil
		})),
		validation.Field(&req.Security, validation.Required, validation.In("starttls", "tls", "none")),
	)
}
