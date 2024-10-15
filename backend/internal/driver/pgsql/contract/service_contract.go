package contract

import (
	"context"
	"github.com/dbo-studio/dbo/internal/driver/pgsql/dto"
)

type IDatabaseService interface {
	Index(context.Context, *dto.GetDatabaseListRequest) (*dto.GetDatabaseListResponse, error)
}
