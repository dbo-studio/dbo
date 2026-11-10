package dto

import "github.com/invopop/validation"

const (
	AiChangesetStatusPending  = "pending"
	AiChangesetStatusAccepted = "accepted"
	AiChangesetStatusRejected = "rejected"
)

type (
	AiChangesetOp struct {
		Position int    `json:"position"`
		Status   string `json:"status"`
		Error    string `json:"error,omitempty"`
		// TableID is the tree node id of the op's table, to open it in the Object Form.
		TableID string `json:"tableId"`
		// UndoNote says why an applied data change cannot be undone.
		UndoNote string `json:"undoNote,omitempty"`
		SchemaChangeOp
	}

	// AiChangesetResponse is a persisted schema proposal with its per-op review
	// state. DiagramOps overlay the proposal on the diagram.
	AiChangesetResponse struct {
		ID           uint            `json:"id"`
		ChatID       uint            `json:"chatId"`
		ConnectionID int32           `json:"connectionId"`
		Database     string          `json:"database,omitempty"`
		Schema       string          `json:"schema,omitempty"`
		Ops          []AiChangesetOp `json:"ops"`
		DiagramOps   []DiagramOp     `json:"diagramOps"`
		// UndoSQL takes back the ops that were applied, when that can be derived.
		UndoSQL []string `json:"undoSql"`
	}

	// AiChangesetReviewRequest accepts, rejects or resets one op by position,
	// or every op that has not been applied when Position is omitted.
	AiChangesetReviewRequest struct {
		Position *int   `json:"position"`
		Status   string `json:"status"`
	}

	AiChangesetApplyRequest struct {
		Confirmed bool `json:"confirmed"`
	}
)

func (req AiChangesetReviewRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Position, validation.Min(0)),
		validation.Field(&req.Status, validation.Required, validation.In(AiChangesetStatusPending, AiChangesetStatusAccepted, AiChangesetStatusRejected)),
	)
}
