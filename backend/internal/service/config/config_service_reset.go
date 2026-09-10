package serviceConfig

import (
	"context"
)

func (i IConfigServiceImpl) ResetFactory(ctx context.Context) error {
	if err := i.configRepo.TruncateAllTables(ctx); err != nil {
		return err
	}

	if i.authService == nil {
		return nil
	}

	return i.authService.Bootstrap(ctx)
}
