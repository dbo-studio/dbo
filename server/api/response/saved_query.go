package response

import (
	"github.com/khodemobin/dbo/model"
)

type savedQueryInfo struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Query string `json:"type"`
}

func SavedQueries(histories []model.SavedQuery) []savedQueryInfo {
	data := []savedQueryInfo{}
	for _, h := range histories {
		data = append(data, SaveQuery(&h))
	}

	return data
}

func SaveQuery(history *model.SavedQuery) savedQueryInfo {
	return savedQueryInfo{
		ID:    int64(history.ID),
		Name:  history.Name,
		Query: history.Query,
	}
}
