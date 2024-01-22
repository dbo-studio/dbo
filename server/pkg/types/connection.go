package types

type ConnectionRequest struct {
	Name     string `json:"name" validate:"required"`
	Host     string `json:"host" validate:"required"`
	Username string `json:"username" validate:"required"`
	Password string `json:"password"`
	Port     int    `json:"port" validate:"required,gte=0,numeric"`
	Database string `json:"database" validate:"required"`
}

type ConnectionSchema struct {
	SchemaName string
	TableName  string
}
