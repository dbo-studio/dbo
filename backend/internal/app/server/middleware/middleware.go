package middleware

import (
	"github.com/goccy/go-json"
	"github.com/gofiber/fiber/v3"
)

func SkipClearRequestMiddleware(c fiber.Ctx) error {
	body := c.Body()
	var data map[string]any

	if err := json.Unmarshal(body, &data); err != nil {
		return c.Next()
	}

	modifiedBody := removeDboIndex(data)
	output, err := json.Marshal(modifiedBody)
	if err == nil {
		c.Request().SetBody(output)
	}

	return c.Next()
}

func removeDboIndex(data map[string]any) map[string]any {
	for _, value := range data {
		if nestedMap, ok := value.(map[string]any); ok {
			// Recursively remove `dbo_index` from nested map
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
