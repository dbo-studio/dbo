package helper

func OptionalString(value string, defaultValue string) string {
	if value != "" {
		return value
	} else {
		return defaultValue
	}
}
