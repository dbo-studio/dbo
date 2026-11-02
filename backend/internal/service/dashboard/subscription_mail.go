package serviceDashboard

import (
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"errors"
	"fmt"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net"
	"net/mail"
	"net/smtp"
	"net/textproto"
	"strconv"
	"strings"
	"time"
)

type smtpConfig struct {
	Host, Username, Password, From, Security string
	Port                                     int
}

type attachment struct {
	Name string
	Data []byte
}

// sendMail sends one HTML message with CSV attachments over the configured account.
func sendMail(cfg smtpConfig, to []string, subject, html string, files []attachment) error {
	from, err := mail.ParseAddress(cfg.From)
	if err != nil {
		return fmt.Errorf("the from address is not valid: %w", err)
	}

	message, err := buildMessage(from.String(), to, subject, html, files)
	if err != nil {
		return err
	}

	addr := net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port))
	dialer := &net.Dialer{Timeout: 15 * time.Second}

	var conn net.Conn
	if cfg.Security == "tls" {
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, &tls.Config{ServerName: cfg.Host, MinVersion: tls.VersionTLS12})
	} else {
		conn, err = dialer.Dial("tcp", addr)
	}

	if err != nil {
		return fmt.Errorf("cannot reach the mail server: %w", err)
	}

	defer conn.Close()

	_ = conn.SetDeadline(time.Now().Add(time.Minute))

	client, err := smtp.NewClient(conn, cfg.Host)
	if err != nil {
		return fmt.Errorf("mail server refused the connection: %w", err)
	}

	defer client.Close()

	if cfg.Security == "starttls" {
		if ok, _ := client.Extension("STARTTLS"); !ok {
			return errors.New("the mail server does not offer STARTTLS; choose another security setting")
		}

		if err := client.StartTLS(&tls.Config{ServerName: cfg.Host, MinVersion: tls.VersionTLS12}); err != nil {
			return fmt.Errorf("STARTTLS failed: %w", err)
		}
	}

	if cfg.Username != "" {
		// PlainAuth only sends the password over TLS or to a local server, which is what we want.
		if err := client.Auth(smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host)); err != nil {
			return fmt.Errorf("the mail server refused the login: %w", err)
		}
	}

	if err := client.Mail(from.Address); err != nil {
		return err
	}

	for _, recipient := range to {
		if err := client.Rcpt(recipient); err != nil {
			return fmt.Errorf("%s was refused: %w", recipient, err)
		}
	}

	writer, err := client.Data()
	if err != nil {
		return err
	}

	if _, err := writer.Write(message); err != nil {
		return err
	}

	if err := writer.Close(); err != nil {
		return err
	}

	return client.Quit()
}

func buildMessage(from string, to []string, subject, html string, files []attachment) ([]byte, error) {
	var body bytes.Buffer

	writer := multipart.NewWriter(&body)

	htmlPart, err := writer.CreatePart(textproto.MIMEHeader{
		"Content-Type":              {"text/html; charset=utf-8"},
		"Content-Transfer-Encoding": {"quoted-printable"},
	})
	if err != nil {
		return nil, err
	}

	qp := quotedprintable.NewWriter(htmlPart)
	_, _ = qp.Write([]byte(html))
	_ = qp.Close()

	for _, file := range files {
		part, err := writer.CreatePart(textproto.MIMEHeader{
			"Content-Type":              {mime.FormatMediaType("text/csv", map[string]string{"charset": "utf-8", "name": file.Name})},
			"Content-Disposition":       {mime.FormatMediaType("attachment", map[string]string{"filename": file.Name})},
			"Content-Transfer-Encoding": {"base64"},
		})
		if err != nil {
			return nil, err
		}

		encoded := base64.StdEncoding.EncodeToString(file.Data)
		for len(encoded) > 76 {
			_, _ = part.Write([]byte(encoded[:76] + "\r\n"))
			encoded = encoded[76:]
		}

		_, _ = part.Write([]byte(encoded + "\r\n"))
	}

	if err := writer.Close(); err != nil {
		return nil, err
	}

	var message bytes.Buffer

	// Header values come from our own fields, but a stray newline in one would add a header: refuse it.
	for _, value := range append([]string{from, subject}, to...) {
		if strings.ContainsAny(value, "\r\n") {
			return nil, errors.New("a mail header cannot contain a line break")
		}
	}

	fmt.Fprintf(&message, "From: %s\r\n", from)
	fmt.Fprintf(&message, "To: %s\r\n", strings.Join(to, ", "))
	fmt.Fprintf(&message, "Subject: %s\r\n", mime.QEncoding.Encode("utf-8", subject))
	fmt.Fprintf(&message, "Date: %s\r\n", time.Now().Format(time.RFC1123Z))
	fmt.Fprintf(&message, "MIME-Version: 1.0\r\n")
	fmt.Fprintf(&message, "Content-Type: multipart/mixed; boundary=%s\r\n\r\n", writer.Boundary())
	message.Write(body.Bytes())

	return message.Bytes(), nil
}
