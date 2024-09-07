package response

import pgsql "github.com/dbo-studio/dbo/driver/pgsql"

type structureResponse struct {
	Name       string  `json:"name"`
	Type       string  `json:"type"`
	NotNull    bool    `json:"not_null"`
	Length     *int32  `json:"length"`
	Default    *string `json:"default"`
	Comment    *string `json:"comment"`
	MappedType string  `json:"mapped_type"`
	Editable   bool    `json:"editable"`
	IsActive   bool    `json:"is_active"`
}

func StructureList(structures []pgsql.Structure) []structureResponse {
	var newStructures []structureResponse
	for _, structure := range structures {
		var s structureResponse

		s.Name = structure.ColumnName
		s.Type = structure.DataType
		s.MappedType = structure.MappedType
		s.Editable = structure.Editable
		s.IsActive = structure.IsActive

		if structure.IsNullable == "NO" {
			s.NotNull = false
		} else {
			s.NotNull = true
		}

		if structure.CharacterMaximumLength.Valid {
			length := structure.CharacterMaximumLength.Int32
			s.Length = &length
		} else {
			s.Length = nil
		}

		if structure.ColumnDefault.Valid {
			defaultString := structure.ColumnDefault.String
			s.Default = &defaultString
		} else {
			s.Default = nil
		}

		if structure.Comment.Valid {
			defaultString := structure.Comment.String
			s.Comment = &defaultString
		} else {
			s.Comment = nil
		}

		newStructures = append(newStructures, s)
	}

	return newStructures
}
