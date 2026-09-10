package databaseConnection

import (
	"net/url"
	"strings"
)

// StripURIPassword removes userinfo password from a connection URI.
// Returns the cleaned URI and the extracted password (empty if none).
func StripURIPassword(raw string) (cleaned string, password string, err error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return raw, "", nil
	}

	parsed, err := url.Parse(raw)
	if err != nil {
		return raw, "", err
	}

	if parsed.User == nil {
		return raw, "", nil
	}

	pass, hasPassword := parsed.User.Password()
	if !hasPassword {
		return raw, "", nil
	}

	parsed.User = url.User(parsed.User.Username())

	return parsed.String(), pass, nil
}

// InjectURIPassword sets the URI userinfo password when the URI has no password yet.
func InjectURIPassword(raw, password string) string {
	if password == "" || strings.TrimSpace(raw) == "" {
		return raw
	}

	parsed, err := url.Parse(raw)
	if err != nil {
		return raw
	}

	username := ""
	if parsed.User != nil {
		username = parsed.User.Username()
		if _, hasPassword := parsed.User.Password(); hasPassword {
			return raw
		}
	}

	parsed.User = url.UserPassword(username, password)

	return parsed.String()
}
