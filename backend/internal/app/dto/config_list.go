package dto

type (
	ConfigListResponse struct {
		Version           string                     `json:"version"`
		URL               string                     `json:"url"`
		LogsPath          string                     `json:"logsPath"`
		NewReleaseVersion *ConfigCheckUpdateResponse `json:"newReleaseVersion"`
		Providers         []AiProvider               `json:"providers"`
	}
)
