package dto

import "database/sql"

type (
	RawQueryRequest struct {
		ConnectionId int32  `json:"connection_id" validate:"required,gte=0"`
		Query        string `json:"query" validate:"required,gte=0"`
	}

	RawQueryResponse struct {
		Query    string
		Data     []map[string]interface{}
		Columns  []Structure
		IsQuery  bool
		Duration string
	}
)

type Structure struct {
	OrdinalPosition        int32          `gorm:"column:ordinal_position"`
	ColumnName             string         `gorm:"column:column_name"`
	DataType               string         `gorm:"column:data_type"`
	IsNullable             string         `gorm:"column:is_nullable"`
	ColumnDefault          sql.NullString `gorm:"column:column_default"`
	CharacterMaximumLength sql.NullInt32  `gorm:"column:character_maximum_length"`
	Comment                sql.NullString `gorm:"column:column_comment"`
	MappedType             string         `gorm:"_:"`
	Editable               bool           `gorm:"_:"`
	IsActive               bool           `gorm:"_:"`
}
