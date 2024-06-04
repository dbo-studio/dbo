package server

import (
	"github.com/goccy/go-json"
	"github.com/gofiber/fiber/v3"
)

func skipClearRequestMiddleware(c fiber.Ctx) error {
	body := c.Body()
	var data map[string]interface{}

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

func removeDboIndex(data map[string]interface{}) map[string]interface{} {
	for _, value := range data {
		// Check if the value is a nested map
		if nestedMap, ok := value.(map[string]interface{}); ok {
			// Recursively remove `dbo_index` from nested map
			removeDboIndex(nestedMap)
		} else if nestedArray, ok := value.([]interface{}); ok {
			// If the value is a slice, iterate through each element
			for _, item := range nestedArray {
				if itemMap, ok := item.(map[string]interface{}); ok {
					removeDboIndex(itemMap)
				}
			}
		}
	}

	delete(data, "dbo_index")
	delete(data, "dboIndex")

	return data
}
