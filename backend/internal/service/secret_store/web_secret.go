package secretStore

import (
	"context"
	"crypto/sha256"
	"errors"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cryptoutil"
)

// WebDBStore persists connection passwords in web_connection_secrets with AES-GCM encryption.
type WebDBStore struct {
	webSessionRepo          webSessionProvider
	webConnectionSecretRepo webConnectionSecretProvider
	aesKey                  []byte
	ttl                     time.Duration
}

func NewWebDBStore(
	webSessionRepo webSessionProvider,
	webConnectionSecretRepo webConnectionSecretProvider,
	secret string,
	ttl time.Duration,
) *WebDBStore {
	sum := sha256.Sum256([]byte(secret))

	return &WebDBStore{
		webSessionRepo:          webSessionRepo,
		webConnectionSecretRepo: webConnectionSecretRepo,
		aesKey:                  sum[:],
		ttl:                     ttl,
	}
}

func (s *WebDBStore) SetConnectionPassword(ctx context.Context, ownerID string, connectionID uint, password string, remember bool) error {
	if err := s.webSessionRepo.EnsureSession(ctx, ownerID); err != nil {
		return err
	}

	enc, err := cryptoutil.EncryptAESGCM(s.aesKey, []byte(password))
	if err != nil {
		return err
	}

	now := time.Now()

	var expiresAt *time.Time

	if !remember {
		t := now.Add(s.ttl)
		expiresAt = &t
	}

	secret := &model.WebConnectionSecret{
		SessionID:    ownerID,
		ConnectionID: connectionID,
		Ciphertext:   enc,
		Remember:     remember,
		ExpiresAt:    expiresAt,
		UpdatedAt:    now,
	}

	return s.webConnectionSecretRepo.Upsert(ctx, secret)
}

func (s *WebDBStore) GetConnectionPassword(ctx context.Context, ownerID string, connectionID uint) (string, error) {
	item, err := s.webConnectionSecretRepo.FindBySessionAndConnection(ctx, ownerID, connectionID)
	if err != nil {
		if errors.Is(err, apperror.ErrWebConnectionSecretNotFound) {
			return "", apperror.Unauthorized(connectionID)
		}

		return "", err
	}

	now := time.Now()
	if item.ExpiresAt != nil && now.After(*item.ExpiresAt) {
		if err := s.webConnectionSecretRepo.Delete(ctx, ownerID, connectionID); err != nil {
			return "", apperror.Unauthorized(connectionID)
		}
	}

	plaintext, err := cryptoutil.DecryptAESGCM(s.aesKey, item.Ciphertext)
	if err != nil {
		return "", err
	}

	if !item.Remember {
		t := now.Add(s.ttl)
		if err := s.webConnectionSecretRepo.UpdateExpiry(ctx, ownerID, connectionID, &t, now); err != nil {
			return "", err
		}
	}

	if err := s.webSessionRepo.TouchLastSeenDebounced(ctx, ownerID, 60*time.Second); err != nil {
		return "", err
	}

	return string(plaintext), nil
}

func (s *WebDBStore) DeleteConnectionPassword(ctx context.Context, ownerID string, connectionID uint) error {
	return s.webConnectionSecretRepo.Delete(ctx, ownerID, connectionID)
}

func (s *WebDBStore) IsTemporaryConnectionPassword(ctx context.Context, ownerID string, connectionID uint) (bool, error) {
	item, err := s.webConnectionSecretRepo.FindBySessionAndConnection(ctx, ownerID, connectionID)
	if err != nil {
		if errors.Is(err, apperror.ErrWebConnectionSecretNotFound) {
			return false, nil
		}

		return false, err
	}

	return !item.Remember, nil
}
