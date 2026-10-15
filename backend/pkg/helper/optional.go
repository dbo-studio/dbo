package helper

func OptionalString(value *string, defaultValue string) string {
	if value != nil {
		return *value
	}

	return defaultValue
}

func OptionalBool(value *bool, defaultValue bool) bool {
	if value != nil {
		return *value
	}

	return defaultValue
}

func Optional[T any](value *T, defaultValue *T) *T {
	if value != nil {
		return value
	}

	return defaultValue
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

// OptionalOrKeep returns value when it is present, including explicit empty strings.
// Use for PATCH fields that can be cleared by sending "".
func OptionalOrKeep[T any](value *T, defaultValue *T) *T {
	if value != nil {
		return value
	}

	return defaultValue
}
