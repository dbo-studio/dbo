package serviceSecretStore

import "context"

type DesktopDBStore struct {
	base *WebDBStore
}

func NewDesktopDBStore(
	webSessionRepo webSessionProvider,
	webConnectionSecretRepo webConnectionSecretProvider,
	secret string,
) *DesktopDBStore {
	return &DesktopDBStore{
		base: NewWebDBStore(webSessionRepo, webConnectionSecretRepo, secret, 0),
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

func (s *DesktopDBStore) IsTemporaryConnectionPassword(ctx context.Context, ownerID string, connectionID uint) (bool, error) {
	return s.base.IsTemporaryConnectionPassword(ctx, ownerID, connectionID)
}
