package response

import "github.com/khodemobin/dbo/drivers/pgsql"

type runQuery struct {
	Query      string              `json:"query"`
	Data       any                 `json:"data"`
	Structures []structureResponse `json:"structures"`
}

type structureResponse struct {
	Name       string  `json:"name"`
	Type       string  `json:"type"`
	NotNull    bool    `json:"not_null"`
	Length     *int32  `json:"length"`
	Default    *string `json:"default"`
	Comment    *string `json:"comment"`
	MappedType string  `json:"mapped_type"`
}

func RunQuery(queryResult *pgsql.RunQueryResult, structures []pgsql.Structure) any {
	var newStructures []structureResponse
	for _, structure := range structures {
		var s structureResponse

		s.Name = structure.ColumnName
		s.Type = structure.DataType
		s.MappedType = structure.MappedType

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

	return runQuery{
		Query:      queryResult.Query,
		Data:       queryResult.Data,
		Structures: newStructures,
	}
}

func RawQuery(queryResult *pgsql.RawQueryResult) any {
	var newStructures []structureResponse
	for _, structure := range queryResult.Columns {
		var s structureResponse
		s.Name = structure.ColumnName
		s.Type = structure.DataType
		s.MappedType = structure.MappedType
		s.NotNull = false
		s.Length = nil
		s.Default = nil

		newStructures = append(newStructures, s)
	}

	return runQuery{
		Query:      queryResult.Query,
		Data:       queryResult.Data,
		Structures: newStructures,
	}
}
