package middleware

import (
	"github.com/goccy/go-json"
	"github.com/gofiber/fiber/v3"
)

// SkipClearRequestBody strips the grid's internal dbo_index/dboIndex keys
// from JSON bodies. It is route-scoped to the endpoints that receive grid
// payloads — a global body rewrite would tax every request.
func SkipClearRequestBody() fiber.Handler {
	return func(c fiber.Ctx) error {
		var data map[string]any

		if err := json.Unmarshal(c.Body(), &data); err != nil {
			return c.Next()
		}

		if output, err := json.Marshal(removeDboIndex(data)); err == nil {
			c.Request().SetBody(output)
		}

		return c.Next()
	}
}

func removeDboIndex(data map[string]any) map[string]any {
	for _, value := range data {
		if nestedMap, ok := value.(map[string]any); ok {
			// Recursively remove `dbo_index` from nested maps
			removeDboIndex(nestedMap)
		} else if nestedArray, ok := value.([]any); ok {
			// If the value is a slice, iterate through each element
			for _, item := range nestedArray {
				if itemMap, ok := item.(map[string]any); ok {
					removeDboIndex(itemMap)
				}
			}
		}
	}

	delete(data, "dbo_index")
	delete(data, "dboIndex")

	return data
}
