package response

type databaseMetaData struct {
	Templates   []string `json:"templates"`
	Tablespaces []string `json:"table_spaces"`
	Encodings   []string `json:"encodings"`
}

func DatabaseMetaData(templates []string, tablespaces []string, encodings []string) any {
	return databaseMetaData{
		Templates:   templates,
		Tablespaces: tablespaces,
		Encodings:   encodings,
	}
}
