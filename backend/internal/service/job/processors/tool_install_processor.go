package processors

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	serviceBackup "github.com/dbo-studio/dbo/internal/service/backup"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	"github.com/dbo-studio/dbo/pkg/helper"
)

// ToolInstallProcessor downloads one pinned native tool. The job exists only
// because the user asked for it; nothing installs on its own.
type ToolInstallProcessor struct {
	jobManager serviceJob.IJobManager
}

func NewToolInstallProcessor(jobManager serviceJob.IJobManager) *ToolInstallProcessor {
	return &ToolInstallProcessor{jobManager: jobManager}
}

func (p *ToolInstallProcessor) GetType() model.JobType {
	return model.JobTypeToolInstall
}

func (p *ToolInstallProcessor) Process(ctx context.Context, job *model.Job) error {
	jobData, err := helper.ConvertToDTO[dto.ToolInstallJob]([]byte(job.Data))
	if err != nil {
		return err
	}

	err = serviceBackup.InstallTool(ctx, jobData.Driver, jobData.Version, func(percent int, message string) {
		_ = p.jobManager.UpdateJobProgress(ctx, job, percent, message)
	})
	if err != nil {
		return fmt.Errorf("install %s %s: %w", jobData.Driver, jobData.Version, err)
	}

	return p.jobManager.UpdateJobProgress(ctx, job, 100, "Tool installed")
}
