package dto

type (
	ConfigListResponse struct {
		Version           string                     `json:"version"`
		Url               string                     `json:"url"`
		NewReleaseVersion *ConfigCheckUpdateResponse `json:"newReleaseVersion"`
		Providers         []AiProvider               `json:"providers"`
	}
)
