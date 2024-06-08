package response

import pgsql "github.com/khodemobin/dbo/driver/pgsql"

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

func RawQuery(queryResult *pgsql.RawQueryResult, err error) any {
	if err != nil || !queryResult.IsQuery {
		return commandResponseBuilder(queryResult, err)
	}

	return runQuery{
		Query:      queryResult.Query,
		Data:       queryResult.Data,
		Structures: StructureList(queryResult.Columns),
	}
}

func commandResponseBuilder(queryResult *pgsql.RawQueryResult, err error) runQuery {
	message := "OK"
	if err != nil {
		message = err.Error()
	}

	newStructures := []structureResponse{
		{
			Name:       "Query",
			Type:       "Varchar",
			MappedType: "string",
			NotNull:    false,
			Length:     nil,
			Default:    nil,
		},
		{
			Name:       "Message",
			Type:       "Varchar",
			MappedType: "string",
			NotNull:    false,
			Length:     nil,
			Default:    nil,
		},
		{
			Name:       "Time",
			Type:       "Varchar",
			MappedType: "string",
			NotNull:    false,
			Length:     nil,
			Default:    nil,
		},
	}

	return runQuery{
		Query: queryResult.Query,
		Data: []map[string]interface{}{
			{
				"Query":    queryResult.Query,
				"Message":  message,
				"Duration": queryResult.Duration,
			},
		},
		Structures: newStructures,
	}
}
