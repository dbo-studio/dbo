package types

type ConnectionRequest struct {
	Name     string `json:"name" validate:"required"`
	Host     string `json:"host" validate:"required"`
	Username string `json:"username" validate:"required"`
	Password string `json:"password"`
	Port     int    `json:"port" validate:"required,gte=0,numeric"`
	Database string `json:"database"`
}

type ConnectionSchema struct {
	Database string   `json:"database"`
	Schemes  []Schema `json:"schemes"`
}

type Schema struct {
	Name   string  `json:"name"`
	Tables []Table `json:"tables"`
}
type Table struct {
	Name    string   `json:"name"`
	DDL     string   `json:"ddl"`
	Columns []Column `json:"columns"`
}

type Column struct {
	Name    string `json:"name"`
	Type    string `json:"types"`
	NotNull bool   `json:"not_null"`
	Length  int32  `json:"length"`
	Decimal int32  `json:"decimal"`
	Default string `json:"default"`
}
