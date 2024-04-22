package response

import pgsql "github.com/khodemobin/dbo/drivers/pgsql"

type runQuery struct {
	Query      string              `json:"query"`
	Data       any                 `json:"data"`
	Structures []structureResponse `json:"structures"`
}

func RunQuery(queryResult *pgsql.RunQueryResult, structures []pgsql.Structure) any {
	return runQuery{
		Query:      queryResult.Query,
		Data:       queryResult.Data,
		Structures: StructureList(structures),
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
