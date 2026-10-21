package aiProvider

import (
	"regexp"
	"strings"
)

// toolNames are the chat tools a model may write out as text instead of calling them.
const toolNames = `(execute_sql|list_tables|list_views|describe_table|explain_query|table_stats|review_schema|show_chart|save_report|pin_report|propose_schema_change|preview_write|update_plan)`

var (
	toolLeakPattern = regexp.MustCompile(`"(name|action|tool|function)"\s*:\s*"` + toolNames + `"`)
	// The call may sit in a code fence, which goes with it.
	toolCallJSONPattern = regexp.MustCompile("(?s)(?:```(?:json)?\\s*)?\\{\\s*\"(?:name|action|tool|function)\"\\s*:\\s*\"" + toolNames +
		"\"\\s*,\\s*\"(?:arguments|parameters)\"\\s*:\\s*\\{.*?\\}\\s*\\}(?:\\s*```)?")
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
