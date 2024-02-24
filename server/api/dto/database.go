package dto

type DatabaseDto struct {
	ConnectionId int32   `json:"connection_id" validate:"required,gte=0"`
	Name         string  `json:"name" validate:"required"`
	Template     *string `json:"template,omitempty"`
	Encoding     *string `json:"encoding,omitempty"`
	TableSpace   *string `json:"table_space,omitempty"`
}

type DeleteDatabaseDto struct {
	ConnectionId int32  `json:"connection_id" validate:"required,gte=0"`
	Name         string `json:"name" validate:"required"`
}
