package job

import "github.com/dbo-studio/dbo/internal/model"

type JobProcessor interface {
	Process(job *model.Job) error
	GetType() model.JobType
}
