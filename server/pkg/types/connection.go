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
	Database string
	Schemes  []Schema
}

type Schema struct {
	Name   string
	Tables []Table
}
type Table struct {
	Name    string
	DDL     string
	Columns []Column
}

type Column struct {
	Name    string
	Type    string
	NotNull bool
	Length  int32
	Decimal int32
	Default string
}
