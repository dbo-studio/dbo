package dto

type CreateHistoryDto struct {
	Name  *string `json:"name"`
	Query string  `json:"query" validate:"required"`
}
