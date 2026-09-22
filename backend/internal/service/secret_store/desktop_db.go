package serviceSecretStore

import (
	"context"

	"github.com/dbo-studio/dbo/pkg/apperror"
)

type DesktopDBStore struct {
	base *WebDBStore
}

func NewDesktopDBStore(
	webSessionRepo webSessionProvider,
	webConnectionSecretRepo webConnectionSecretProvider,
	sharedSecretRepo connectionSharedSecretProvider,
	secret string,
) *DesktopDBStore {
	return &DesktopDBStore{
		base: NewWebDBStore(webSessionRepo, webConnectionSecretRepo, sharedSecretRepo, secret, 0),
	}
}

func (s *DesktopDBStore) SetConnectionPassword(ctx context.Context, ownerID string, connectionID uint, password string, _ bool) error {
	return s.base.SetConnectionPassword(ctx, ownerID, connectionID, password, true)
}

func (s *DesktopDBStore) GetConnectionPassword(ctx context.Context, ownerID string, connectionID uint) (string, error) {
	return s.base.GetConnectionPassword(ctx, ownerID, connectionID)
}

func (s *DesktopDBStore) DeleteConnectionPassword(ctx context.Context, ownerID string, connectionID uint) error {
	return s.base.DeleteConnectionPassword(ctx, ownerID, connectionID)
}

func (s *DesktopDBStore) DeleteAllConnectionPasswords(ctx context.Context, connectionID uint) error {
	return s.base.DeleteAllConnectionPasswords(ctx, connectionID)
}

func (s *DesktopDBStore) IsTemporaryConnectionPassword(ctx context.Context, ownerID string, connectionID uint) (bool, error) {
	return s.base.IsTemporaryConnectionPassword(ctx, ownerID, connectionID)
}

func (s *DesktopDBStore) GetSharedConnectionPassword(_ context.Context, connectionID uint) (string, error) {
	return "", apperror.Unauthorized(connectionID)
}

func (s *DesktopDBStore) SetSharedConnectionPassword(_ context.Context, _ uint, _ string) error {
	return apperror.BadRequest(apperror.ErrSharingUnavailable)
}

func (s *DesktopDBStore) DeleteSharedConnectionPassword(_ context.Context, _ uint) error {
	return nil
}

func (s *DesktopDBStore) HasSharedConnectionPassword(_ context.Context, _ uint) (bool, error) {
	return false, nil
}

func (s *DesktopDBStore) SharedPasswordConnectionIDs(_ context.Context, _ []uint) (map[uint]struct{}, error) {
	return map[uint]struct{}{}, nil
}
