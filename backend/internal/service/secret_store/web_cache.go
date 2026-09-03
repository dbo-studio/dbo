package secretStore

import (
	"context"
	"crypto/sha256"
	"time"

	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/cryptoutil"
)

type webCacheItem struct {
	Ciphertext string `json:"ciphertext"`
	Remember   bool   `json:"remember"`
}

type WebCacheStore struct {
	cache  cache.Cache
	aesKey []byte
	ttl    time.Duration
}

func NewWebCacheStore(c cache.Cache, secret string, ttl time.Duration) *WebCacheStore {
	// Derive a fixed 32-byte key from secret to avoid key-size issues.
	sum := sha256.Sum256([]byte(secret))

	return &WebCacheStore{
		cache:  c,
		aesKey: sum[:],
		ttl:    ttl,
	}
}

func (s *WebCacheStore) SetConnectionPassword(ctx context.Context, ownerID string, connectionID uint, password string, remember bool) error {
	enc, err := cryptoutil.EncryptAESGCM(s.aesKey, []byte(password))
	if err != nil {
		return err
	}

	item := &webCacheItem{
		Ciphertext: enc,
		Remember:   remember,
	}

	if remember {
		return s.cache.Set(ctx, cache.ConnectionSecretKey(ownerID, connectionID), item, nil)
	}

	ttl := s.ttl

	return s.cache.Set(ctx, cache.ConnectionSecretKey(ownerID, connectionID), item, &ttl)
}

func (s *WebCacheStore) GetConnectionPassword(ctx context.Context, ownerID string, connectionID uint) (string, error) {
	var item *webCacheItem
	if err := s.cache.Get(ctx, cache.ConnectionSecretKey(ownerID, connectionID), &item); err != nil {
		return "", err
	}

	if item == nil {
		return "", apperror.Unauthorized(connectionID)
	}

	plaintext, err := cryptoutil.DecryptAESGCM(s.aesKey, item.Ciphertext)
	if err != nil {
		return "", err
	}

	// Sliding TTL for non-remember.
	if !item.Remember {
		ttl := s.ttl
		if err := s.cache.Set(ctx, cache.ConnectionSecretKey(ownerID, connectionID), item, &ttl); err != nil {
			return "", err
		}
	}

	return string(plaintext), nil
}

func (s *WebCacheStore) DeleteConnectionPassword(ctx context.Context, ownerID string, connectionID uint) error {
	return s.cache.Delete(ctx, cache.ConnectionSecretKey(ownerID, connectionID))
}
