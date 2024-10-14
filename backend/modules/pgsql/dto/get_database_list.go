package dto

type (
	GetDatabaseRequest struct {
		ConnectionId int32
		FromCache    bool
	}
)
