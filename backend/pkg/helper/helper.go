package helper

import (
	"os"
	"strconv"

	"github.com/goccy/go-json"
)

func IsLocal() bool {
	return os.Getenv("APP_ENV") == "local"
}

//func HasString(list []string, find string) bool {
//	for _, b := range list {
//		if b == find {
//			return true
//		}
//	}
//	return false
//}
//
//func ToJson(v any) (string, error) {
//	j, err := json.Marshal(v)
//	return string(j), err
//}
//
//func StringToFloat(str string) float64 {
//	if str == "" {
//		return 0
//	}
//
//	floatStr, err := strconv.ParseFloat(str, 64)
//	if err != nil {
//		zap.L().Error("cant convert price", zap.Error(err))
//		return 0
//	}
//
//	return floatStr
//}

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
	err := json.Unmarshal(value, &v)
	return v, err
}
