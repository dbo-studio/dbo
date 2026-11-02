package dto

import (
	"time"

	"github.com/goccy/go-json"
)

type (
	JobDetailRequest struct {
		JobID int32
	}

	JobDetailResponse struct {
		ID       uint   `json:"id"`
		Type     string `json:"type"`
		Status   string `json:"status"`
		Progress int    `json:"progress"`
		Result   any    `json:"result"`
		Message  string `json:"message"`
		Error    string `json:"error"`
		// Data is what the job was started with (for a query: its request), enough to rebuild it on screen.
		Data        json.RawMessage `json:"data,omitempty"`
		StartedAt   *time.Time      `json:"startedAt"`
		CompletedAt *time.Time      `json:"completedAt"`
	}
)
