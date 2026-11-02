package dto

import "github.com/invopop/validation"

const (
	PlanStepPending    = "pending"
	PlanStepInProgress = "in_progress"
	PlanStepDone       = "done"
)

type (
	// AiPlanStep is one item of the agent's checklist.
	AiPlanStep struct {
		Title  string `json:"title"`
		Status string `json:"status"`
	}

	// AiPlan is the agent's whole checklist; each update replaces the last.
	AiPlan struct {
		Steps []AiPlanStep `json:"steps"`
	}
)

func (step AiPlanStep) Validate() error {
	return validation.ValidateStruct(&step,
		validation.Field(&step.Title, validation.Required, validation.Length(1, 200)),
		validation.Field(&step.Status, validation.In(PlanStepPending, PlanStepInProgress, PlanStepDone)),
	)
}

func (plan AiPlan) Validate() error {
	return validation.ValidateStruct(&plan,
		validation.Field(&plan.Steps, validation.Required, validation.Length(1, 12)),
	)
}
