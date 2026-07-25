package job

import "github.com/dbo-studio/dbo/internal/model"

type Processor interface {
	Process(job *model.Job) error
	GetType() model.JobType
}
