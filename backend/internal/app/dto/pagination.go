package dto

type PaginationRequest struct {
	Page  *int `query:"page"`
	Count *int `query:"count"`
}
