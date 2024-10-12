package dto

type (
	DatabaseMetaDataResponse struct {
		Templates   []string `json:"templates"`
		Tablespaces []string `json:"table_spaces"`
		Encodings   []string `json:"encodings"`
		DataTypes   []string `json:"data_types"`
	}
)
