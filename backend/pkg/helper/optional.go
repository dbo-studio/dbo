package helper

func OptionalString(value *string, defaultValue string) string {
	if value != nil {
		return *value
	} else {
		return defaultValue
	}
}

func OptionalBool(value *bool, defaultValue bool) bool {
	if value != nil {
		return *value
	} else {
		return defaultValue
	}
}

// Optional  don't judge me for this function name :))))
func Optional[T any](value *T, defaultValue *T) *T {
	if value != nil {
		return value
	} else {
		return defaultValue
	}
}

func OptionalAndEmpty[T any](value *T, defaultValue *T) *T {
	if value != nil {
		if strVal, ok := any(*value).(string); ok {
			if strVal != "" {
				return value
			}
		} else {
			return value
		}
	}
	return defaultValue
}
