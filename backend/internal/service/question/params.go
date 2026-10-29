package serviceQuestion

import (
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/samber/lo"
)

// A report's SQL may hold {{name}} filters; every run fills them from the values the editor or board sends.
var (
	paramPattern = regexp.MustCompile(`\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}`)
	numberValue  = regexp.MustCompile(`^-?\d+(\.\d+)?$`)
)

var errParamNul = errors.New("a filter value cannot contain a NUL character")

// RenderParams replaces each {{name}} with its value as a SQL literal: plain numbers stay numbers,
// anything else becomes a quoted string. backslashEscapes is set for MySQL, where a backslash escapes in strings.
// shortcut: values are inlined as escaped literals behind the read-only guard, not bound; bind them
// before a report runs for someone who does not own the connection (share links).
func RenderParams(sql string, values map[string]string, backslashEscapes bool) (string, error) {
	var missing []string
	invalid := false

	rendered := paramPattern.ReplaceAllStringFunc(sql, func(match string) string {
		name := paramPattern.FindStringSubmatch(match)[1]
		value := values[name]

		switch {
		case value == "":
			missing = append(missing, name)
			return match
		case strings.ContainsRune(value, 0):
			invalid = true
			return match
		case numberValue.MatchString(value):
			return value
		}

		if backslashEscapes {
			value = strings.ReplaceAll(value, `\`, `\\`)
		}

		return "'" + strings.ReplaceAll(value, "'", "''") + "'"
	})

	if invalid {
		return "", errParamNul
	}

	if len(missing) > 0 {
		return "", fmt.Errorf("set a value for %s", strings.Join(lo.Uniq(missing), ", "))
	}

	return rendered, nil
}
