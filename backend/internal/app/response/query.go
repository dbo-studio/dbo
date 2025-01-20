package response

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	pgsql "github.com/dbo-studio/dbo/internal/driver/pgsql"
	"slices"
)

type runQuery struct {
	Query      string                `json:"query"`
	Data       any                   `json:"data"`
	Structures []dto.GetDesignColumn `json:"structures"`
}

func RunQuery(queryResult *pgsql.RunQueryResult, structures []dto.GetDesignColumn, activeColumns []string) any {
	if len(activeColumns) > 0 {
		for i, s := range structures {
			structures[i].IsActive = slices.Contains(activeColumns, s.Name)
		}
	}

	return runQuery{
		Query:      queryResult.Query,
		Data:       queryResult.Data,
		Structures: structures,
	}
}

func RawQuery(queryResult *pgsql.RawQueryResult, columns []dto.GetDesignColumn, err error) any {
	if err != nil || !queryResult.IsQuery {
		return commandResponseBuilder(queryResult, err)
	}
	for i := 0; i < len(queryResult.Columns); i++ {
		queryResult.Columns[i].IsActive = true
	}

	return runQuery{
		Query:      queryResult.Query,
		Data:       queryResult.Data,
		Structures: columns,
	}
}

func commandResponseBuilder(queryResult *pgsql.RawQueryResult, err error) runQuery {
	message := "OK"
	if err != nil {
		message = err.Error()
	}

	newStructures := []dto.GetDesignColumn{
		{
			Name:       "Query",
			Type:       "Varchar",
			MappedType: "string",
			NotNull:    false,
			Length:     nil,
			Default:    nil,
			IsActive:   true,
		},
		{
			Name:       "Message",
			Type:       "Varchar",
			MappedType: "string",
			NotNull:    false,
			Length:     nil,
			Default:    nil,
			IsActive:   true,
		},
		{
			Name:       "Time",
			Type:       "Varchar",
			MappedType: "string",
			NotNull:    false,
			Length:     nil,
			Default:    nil,
			IsActive:   true,
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
