package serviceAiProvider

import (
	"regexp"
	"strings"
)

var (
	toolLeakPattern     = regexp.MustCompile(`"name"\s*:\s*"(execute_sql|list_tables|list_views|describe_table)"`)
	toolCallJSONPattern = regexp.MustCompile(`(?s)\{\s*"name"\s*:\s*"(execute_sql|list_tables|list_views|describe_table)"\s*,\s*"(arguments|parameters)"\s*:\s*\{.*?\}\s*\}`)
	multiNewlinePattern = regexp.MustCompile(`\n{3,}`)
)

func hasToolCallLeak(content string) bool {
	if strings.TrimSpace(content) == "" {
		return false
	}

	if !toolLeakPattern.MatchString(content) {
		return false
	}

	return strings.Contains(content, `"arguments"`) || strings.Contains(content, `"parameters"`)
}

func stripToolCallLeak(content string) string {
	if !hasToolCallLeak(content) {
		return content
	}

	stripped := toolCallJSONPattern.ReplaceAllString(content, "")
	stripped = multiNewlinePattern.ReplaceAllString(stripped, "\n\n")

	return strings.TrimSpace(stripped)
}
