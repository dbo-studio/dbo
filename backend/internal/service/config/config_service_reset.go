package serviceConfig

import (
	"context"
)

func (i IConfigServiceImpl) ResetFactory(ctx context.Context) error {
	return i.configRepo.TruncateAllTables(ctx)
}
