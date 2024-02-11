package helper

import (
	"encoding/json"
	"os"
)

func IsLocal() bool {
	return os.Getenv("APP_ENV") == "local"
}

func HasString(list []string, find string) bool {
	for _, b := range list {
		if b == find {
			return true
		}
	}
	return false
}

func ToJson(v any) (string, error) {
	j, err := json.Marshal(v)
	return string(j), err
}
