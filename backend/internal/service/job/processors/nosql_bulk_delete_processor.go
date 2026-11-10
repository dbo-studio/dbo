package processors

import (
	"context"
	"errors"
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	"github.com/dbo-studio/dbo/pkg/helper"
)

// NoSQLBulkDeleteProcessor deletes every item matching a pattern in bounded batches.
// Cancel works between batches: the driver stops when ctx is done.
type NoSQLBulkDeleteProcessor struct {
	jobManager     serviceJob.IJobManager
	cm             *databaseConnection.ConnectionManager
	connectionRepo repository.IConnectionRepo
}

func NewNoSQLBulkDeleteProcessor(jobManager serviceJob.IJobManager, cm *databaseConnection.ConnectionManager, connectionRepo repository.IConnectionRepo) *NoSQLBulkDeleteProcessor {
	return &NoSQLBulkDeleteProcessor{jobManager: jobManager, cm: cm, connectionRepo: connectionRepo}
}

func (p *NoSQLBulkDeleteProcessor) GetType() model.JobType {
	return model.JobTypeBulkDelete
}

func (p *NoSQLBulkDeleteProcessor) Process(ctx context.Context, job *model.Job) error {
	data, err := helper.ConvertToDTO[dto.NoSQLBulkDeleteJob]([]byte(job.Data))
	if err != nil {
		return fmt.Errorf("could not convert job data: %w", err)
	}

	ctx = helper.CtxWithOwnerID(ctx, data.OwnerID)

	connection, err := p.connectionRepo.Find(ctx, data.ConnectionID)
	if err != nil {
		return err
	}

	repo, err := database.NewNoSQLRepository(ctx, connection, p.cm)
	if err != nil {
		return err
	}

	deleter, ok := repo.(databaseContract.BulkDeleter)
	if !ok {
		return errors.New("connection does not support bulk delete")
	}

	if err := p.jobManager.UpdateJobProgress(ctx, job, 5, "Deleting keys matching "+data.Pattern); err != nil {
		return err
	}

	total, err := deleter.DeleteMatching(ctx, data.ContainerID, data.Pattern, func(deleted int) {
		// The expected count is a preview estimate (capped), so progress never reaches 100 before the scan ends.
		pct := 5
		if data.Expected > 0 {
			pct = min(95, 5+deleted*90/data.Expected)
		}

		_ = p.jobManager.UpdateJobProgress(ctx, job, pct, fmt.Sprintf("Deleted %d keys", deleted))
	})

	// Report what was removed even when the run was canceled or failed part way.
	job.Result = model.JobResult{TotalRows: total, SuccessRows: total}

	if err != nil {
		if ctx.Err() != nil {
			return fmt.Errorf("job was canceled after deleting %d keys", total)
		}

		return err
	}

	return p.jobManager.UpdateJobProgress(ctx, job, 100, fmt.Sprintf("Deleted %d keys", total))
}
