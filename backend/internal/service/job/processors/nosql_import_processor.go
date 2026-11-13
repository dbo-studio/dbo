package processors

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/nosqlimport"
)

// NoSQLImportTempPrefix names the temp files an upload is spooled to; the processor only reads files with it.
const NoSQLImportTempPrefix = "dbo-nosql-import-"

const nosqlImportBatch = 1000

// NoSQLImportProcessor inserts the documents of an uploaded file in batches, reading the file as a stream so its size
// is bounded by the disk, not by memory. Cancel works between batches.
type NoSQLImportProcessor struct {
	jobManager     serviceJob.IJobManager
	cm             *databaseConnection.ConnectionManager
	connectionRepo repository.IConnectionRepo
}

func NewNoSQLImportProcessor(jobManager serviceJob.IJobManager, cm *databaseConnection.ConnectionManager, connectionRepo repository.IConnectionRepo) *NoSQLImportProcessor {
	return &NoSQLImportProcessor{jobManager: jobManager, cm: cm, connectionRepo: connectionRepo}
}

func (p *NoSQLImportProcessor) GetType() model.JobType {
	return model.JobTypeNoSQLImport
}

func (p *NoSQLImportProcessor) Process(ctx context.Context, job *model.Job) error {
	data, err := helper.ConvertToDTO[dto.NoSQLImportJob]([]byte(job.Data))
	if err != nil {
		return fmt.Errorf("could not convert job data: %w", err)
	}

	// The upload is removed whether the import finishes, fails or is canceled.
	defer func() { _ = os.Remove(data.Path) }()

	if !strings.HasPrefix(filepath.Base(data.Path), NoSQLImportTempPrefix) {
		return errors.New("not an uploaded import file")
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

	transfer, ok := repo.(databaseContract.DataTransfer)
	if !ok {
		return errors.New("connection does not support import")
	}

	f, err := os.Open(data.Path)
	if err != nil {
		return err
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil {
		return err
	}

	if err := p.jobManager.UpdateJobProgress(ctx, job, 2, "Reading the file"); err != nil {
		return err
	}

	var (
		batch    []string
		inserted int
	)

	flush := func() error {
		if len(batch) == 0 {
			return nil
		}

		if err := ctx.Err(); err != nil {
			return err
		}

		n, err := transfer.ImportDocs(ctx, data.ContainerID, batch)
		inserted += n
		batch = batch[:0]

		return err
	}

	progress := func(read int64) {
		pct := 2
		if info.Size() > 0 {
			pct = min(98, 2+int(read*96/info.Size()))
		}

		_ = p.jobManager.UpdateJobProgress(ctx, job, pct, fmt.Sprintf("Imported %d documents", inserted))
	}

	err = nosqlimport.Docs(f, data.Format, func(doc string) error {
		batch = append(batch, doc)
		if len(batch) < nosqlImportBatch {
			return nil
		}

		return flush()
	}, progress)

	if err == nil {
		err = flush()
	}

	// Report what was written even when the run failed or was canceled part way.
	job.Result = model.JobResult{TotalRows: inserted, SuccessRows: inserted}

	if err != nil {
		if ctx.Err() != nil {
			return fmt.Errorf("job was canceled after importing %d documents", inserted)
		}

		return fmt.Errorf("stopped after importing %d documents: %w", inserted, err)
	}

	return p.jobManager.UpdateJobProgress(ctx, job, 100, fmt.Sprintf("Imported %d documents", inserted))
}
