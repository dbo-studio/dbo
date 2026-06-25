package dto

type (
	ConfigCheckUpdateResponse struct {
		Name        string `json:"name"`
		URL         string `json:"url"`
		Body        string `json:"body"`
		PublishedAt string `json:"publishedAt"`
		IsMinimum   bool   `json:"isMinimum"`
	}
)
