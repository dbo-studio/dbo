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

func OptionalUint(value *uint, defaultValue uint) uint {
	if value != nil {
		return *value
	} else {
		return defaultValue
	}
}
