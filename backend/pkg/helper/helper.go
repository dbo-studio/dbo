package helper

import (
	"os"
	"strconv"

	"github.com/goccy/go-json"
)

func IsLocal() bool {
	return os.Getenv("APP_ENV") == "local"
}

func FloatToString(str float64) string {
	return strconv.FormatFloat(str, 'f', -1, 64)
}

func StructToJson(value interface{}) string {
	j, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return string(j)
}

func RawJsonToStruct[T any](value json.RawMessage) (T, error) {
	var v T
	if value == nil {
		return v, nil
	}

	err := json.Unmarshal(value, &v)
	return v, err
}
