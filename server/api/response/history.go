package response

import (
	"github.com/khodemobin/dbo/model"
)

type historyInfo struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Query string `json:"type"`
}

func Histories(histories []model.History) []historyInfo {
	data := []historyInfo{}
	for _, h := range histories {
		data = append(data, History(&h))
	}

	return data
}

func History(history *model.History) historyInfo {
	return historyInfo{
		ID:    int64(history.ID),
		Name:  history.Name,
		Query: history.Query,
	}
}
