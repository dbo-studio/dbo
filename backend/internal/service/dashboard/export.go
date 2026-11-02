package serviceDashboard

import "context"

// SMTPConfig is an outgoing mail account, for other services that send mail.
type SMTPConfig = smtpConfig

// SendMail sends one HTML message without attachments.
func SendMail(cfg SMTPConfig, to []string, subject, html string) error {
	return sendMail(cfg, to, subject, html, nil)
}

// PostWebhook sends a JSON body, optionally HMAC-signed, with the same private-address guard dashboards use.
func PostWebhook(ctx context.Context, url string, body []byte, secret, event string, allowInternal bool) error {
	return postWebhook(ctx, url, body, secret, event, allowInternal)
}
