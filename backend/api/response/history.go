package response

import (
	"github.com/dbo-studio/dbo/model"
)

type history struct {
	ID        int64  `json:"id"`
	Query     string `json:"query"`
	CreatedAt string `json:"created_at"`
}

func Histories(histories []model.History) []history {
	data := []history{}
	for _, h := range histories {
		data = append(data, History(&h))
	}

	return data
}

func History(model *model.History) history {
	return history{
		ID:        int64(model.ID),
		Query:     model.Query,
		CreatedAt: model.CreatedAt.Time.Format("2006-01-02 15:04:05"),
	}
}
