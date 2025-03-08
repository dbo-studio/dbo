package dto

type (
	DatabaseMetaDataResponse struct {
		Templates   []string `json:"templates"`
		Tablespaces []string `json:"tableSpaces"`
		Encodings   []string `json:"encodings"`
		DataTypes   []string `json:"dataTypes"`
	}
)
