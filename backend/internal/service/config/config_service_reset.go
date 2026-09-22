package serviceConfig

import (
	"context"

	"github.com/dbo-studio/dbo/pkg/helper"
)

func (i IConfigServiceImpl) ResetFactory(ctx context.Context) error {
	if err := helper.RequireInstanceAdmin(ctx); err != nil {
		return err
	}

	if err := i.configRepo.TruncateAllTables(ctx); err != nil {
		return err
	}

	if i.authService == nil {
		return nil
	}

	return i.authService.Bootstrap(ctx)
}
