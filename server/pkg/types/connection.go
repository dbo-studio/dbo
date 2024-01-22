package types

type AddConnectionRequest struct {
	Name     string `json:"name" validate:"required"`
	Host     string `json:"host" validate:"required"`
	Username string `json:"username" validate:"required"`
	Password string `json:"password"`
	Port     int    `json:"port" validate:"required,gte=0,numeric"`
	Database string `json:"database" validate:"required"`
}

type UpdateConnectionRequest struct {
	Name     string `json:"name"`
	Host     string `json:"host"`
	Username string `json:"username"`
	Password string `json:"password"`
	Port     int32  `json:"port" validate:"gte=0,numeric"`
	Database string `json:"database"`
}
