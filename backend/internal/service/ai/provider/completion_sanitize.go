package aiProvider

import (
	"regexp"
	"strings"
)

// fenceOpen is an opening code fence with any language tag: ```sql, ```javascript, ```redis.
var fenceOpen = regexp.MustCompile("^```[A-Za-z]*")

func sanitizeCompletion(prefix, suffix, completion string) string {
	completion = strings.TrimSpace(completion)
	if completion == "" {
		return ""
	}

	completion = stripCodeFences(completion)
	completion = trimPrefixOverlap(prefix, completion)

	if suffix != "" {
		if idx := strings.Index(completion, suffix); idx >= 0 {
			completion = completion[:idx]
		}

		completion = trimSuffixOverlap(completion, suffix)
	}

	if idx := strings.Index(completion, "\n\n"); idx >= 0 {
		completion = completion[:idx]
	}

	return strings.TrimRight(completion, " \t")
}

func stripCodeFences(text string) string {
	text = strings.TrimSpace(text)
	text = fenceOpen.ReplaceAllString(text, "")
	text = strings.TrimSuffix(text, "```")

	return strings.TrimSpace(text)
}

func trimPrefixOverlap(prefix, completion string) string {
	maxOverlap := min(len(prefix), len(completion))
	for i := maxOverlap; i > 0; i-- {
		if strings.HasSuffix(prefix, completion[:i]) {
			return completion[i:]
		}
	}

	return completion
}

func trimSuffixOverlap(completion, suffix string) string {
	maxOverlap := min(len(completion), len(suffix))
	for i := maxOverlap; i > 0; i-- {
		tail := completion[len(completion)-i:]
		if strings.HasPrefix(suffix, tail) {
			return completion[:len(completion)-i]
		}
	}

	return completion
}
