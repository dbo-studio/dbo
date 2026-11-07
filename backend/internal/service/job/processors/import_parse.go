package processors

import (
	"fmt"

	"github.com/dbo-studio/dbo/pkg/csv"
)

// ParseImportFile reads an import file into rows and the column names found in it.
// delimiter only matters for csv and may be empty.
func ParseImportFile(format, delimiter string, data []byte) (rows [][]string, columns []string, err error) {
	switch format {
	case "csv":
		var comma rune
		if delimiter != "" {
			comma = []rune(delimiter)[0]
		}

		return csv.Reader(string(data), comma)
	case "json":
		return parseJSONFile(data)
	case "sql":
		return parseSQLFile(data)
	default:
		return nil, nil, fmt.Errorf("unsupported file format: %s", format)
	}
}

// ApplyImportMapping keeps the mapped file columns and renames them to their table columns.
// A nil mapping keeps the file as it is. Two file columns may not feed one table column.
func ApplyImportMapping(rows [][]string, columns []string, mapping map[string]string) ([][]string, []string, error) {
	if mapping == nil {
		return rows, columns, nil
	}

	var (
		keep   []int
		target []string
		used   = map[string]bool{}
	)

	for i, col := range columns {
		to := mapping[col]
		if to == "" {
			continue
		}

		if used[to] {
			return nil, nil, fmt.Errorf("column %q is mapped more than once", to)
		}

		used[to] = true

		keep = append(keep, i)
		target = append(target, to)
	}

	if len(keep) == 0 {
		return nil, nil, fmt.Errorf("no column is mapped to the table")
	}

	out := make([][]string, len(rows))

	for r, row := range rows {
		picked := make([]string, len(keep))

		for j, i := range keep {
			if i < len(row) {
				picked[j] = row[i]
			}
		}

		out[r] = picked
	}

	return out, target, nil
}
