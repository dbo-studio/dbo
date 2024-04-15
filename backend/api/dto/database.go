package dto

type DatabaseDto struct {
	ConnectionId int32   `json:"connection_id" validate:"required,gte=0"`
	Name         string  `json:"name" validate:"required"`
	Template     *string `json:"template"`
	Encoding     *string `json:"encoding"`
	TableSpace   *string `json:"table_space"`
}

type DeleteDatabaseDto struct {
	ConnectionId int32  `json:"connection_id" validate:"required,gte=0"`
	Name         string `json:"name" validate:"required"`
}
