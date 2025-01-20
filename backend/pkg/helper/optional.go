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

func OptionalInt32(value *int32, defaultValue int32) int32 {
	if value != nil {
		return *value
	} else {
		return defaultValue
	}
}
