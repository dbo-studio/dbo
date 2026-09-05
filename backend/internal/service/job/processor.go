package serviceJob

import (
	"context"

	"github.com/dbo-studio/dbo/internal/model"
)

type Processor interface {
	// Process receives a cancellable context derived from the manager's worker
	// context; a user cancel or shutdown cancels it between processing steps.
	Process(ctx context.Context, job *model.Job) error
	GetType() model.JobType
}
