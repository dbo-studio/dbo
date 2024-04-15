package dto

type CreateConnectionDto struct {
	Name     string `json:"name" validate:"required"`
	Host     string `json:"host" validate:"required"`
	Username string `json:"username" validate:"required"`
	Password string `json:"password"`
	Port     int    `json:"port" validate:"required,gte=0,numeric"`
	Database string `json:"database"`
}

type UpdateConnectionDto struct {
	Name            *string `json:"name"`
	Host            *string `json:"host"`
	Username        *string `json:"username"`
	Password        *string `json:"password"`
	Port            *uint   `json:"port"`
	Database        *string `json:"database"`
	IsActive        *bool   `json:"is_active"`
	CurrentDatabase *string `json:"current_database"`
	CurrentSchema   *string `json:"current_schema"`
}
