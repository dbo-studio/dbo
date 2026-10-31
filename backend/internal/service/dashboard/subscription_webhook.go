package serviceDashboard

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net"
	"net/http"
	"syscall"
	"time"
)

var errPrivateAddress = errors.New("the webhook points at a private or local address, which this server does not allow")

func isInternal(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() || ip.IsMulticast()
}

// postWebhook sends the body as JSON. When internal targets are not allowed, the check runs on the address
// actually dialled, so a name that resolves to a private address, or a redirect to one, is refused too.
func postWebhook(ctx context.Context, url string, body []byte, secret string, allowInternal bool) error {
	dialer := &net.Dialer{
		Timeout: 10 * time.Second,
		Control: func(_, address string, _ syscall.RawConn) error {
			if allowInternal {
				return nil
			}

			host, _, err := net.SplitHostPort(address)
			if err != nil {
				return err
			}

			if ip := net.ParseIP(host); ip == nil || isInternal(ip) {
				return errPrivateAddress
			}

			return nil
		},
	}

	client := &http.Client{
		Timeout:   20 * time.Second,
		Transport: &http.Transport{DialContext: dialer.DialContext},
		// A redirect is another request to somewhere we did not vet.
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "DBO-Studio")
	req.Header.Set("X-DBO-Event", "dashboard.snapshot")

	if secret != "" {
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write(body)
		req.Header.Set("X-DBO-Signature", "sha256="+hex.EncodeToString(mac.Sum(nil)))
	}

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("the webhook could not be reached: %w", err)
	}

	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("the webhook answered %d", resp.StatusCode)
	}

	return nil
}
