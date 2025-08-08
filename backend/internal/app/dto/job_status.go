package dto

type (
	JobDetailRequest struct {
		ConnectionId int32
	}

	JobDetailResponse struct {
		ID       int32  `json:"id"`
		Type     string `json:"type"`
		Status   string `json:"status"`
		Progress int    `json:"progress"`
		Result   any    `json:"result"`
		Message  string `json:"message"`
		Error    string `json:"error"`
	}
)
