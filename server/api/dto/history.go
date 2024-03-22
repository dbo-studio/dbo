package dto

type CreateSavedQueryDto struct {
	Name  *string `json:"name"`
	Query string  `json:"query" validate:"required"`
}
