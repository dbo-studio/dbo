package dto

type (
	JobDetailRequest struct {
		JobId int32
	}

	JobDetailResponse struct {
		ID       uint   `json:"id"`
		Type     string `json:"type"`
		Status   string `json:"status"`
		Progress int    `json:"progress"`
		Result   any    `json:"result"`
		Message  string `json:"message"`
		Error    string `json:"error"`
	}
)
