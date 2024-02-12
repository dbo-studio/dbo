package response

import "github.com/khodemobin/dbo/drivers/pgsql"

type runQuery struct {
	Query      string              `json:"query"`
	Data       any                 `json:"data"`
	Structures []structureResponse `json:"structures"`
}

type structureResponse struct {
	Name    string  `json:"name"`
	Type    string  `json:"type"`
	NotNull bool    `json:"not_null"`
	Length  *int32  `json:"length"`
	Default *string `json:"default"`
}

func RunQuery(queryResult *pgsql.RunQueryResult, structures []pgsql.Structure) any {
	var newStructures []structureResponse
	for _, structure := range structures {
		var s structureResponse

		s.Name = structure.ColumnName
		s.Type = structure.DataType

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

		newStructures = append(newStructures, s)
	}

	return runQuery{
		Query:      queryResult.Query,
		Data:       queryResult.Data,
		Structures: newStructures,
	}
}
