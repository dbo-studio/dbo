package dto

type ConnectionDto struct {
	Name            string `json:"name" validate:"required"`
	Host            string `json:"host" validate:"required"`
	Username        string `json:"username" validate:"required"`
	Password        string `json:"password"`
	Port            int    `json:"port" validate:"required,gte=0,numeric"`
	Database        string `json:"database"`
	IsActive        *bool  `json:"is_active,omitempty" validate:"boolean"`
	CurrentDatabase string `json:"current_database"`
	CurrentSchema   string `json:"current_schema"`
}
