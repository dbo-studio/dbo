package processors

import (
	"context"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

// RestoreProcessor registers the restore job type. The restore engine lands
// with the Layer A restore task; until then a queued restore fails with a clear
// message instead of silently doing nothing.
type RestoreProcessor struct{}

func NewRestoreProcessor() *RestoreProcessor {
	return &RestoreProcessor{}
}

func (p *RestoreProcessor) GetType() model.JobType {
	return model.JobTypeRestore
}

func (p *RestoreProcessor) Process(_ context.Context, _ *model.Job) error {
	return apperror.ErrRestoreNotAvailable
}
