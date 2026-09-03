package csv

import (
	"encoding/csv"
	"errors"
	"fmt"
	"strings"
)

func Reader(data string) (rows [][]string, headers []string, err error) {
	reader := csv.NewReader(strings.NewReader(data))

	allRows, err := reader.ReadAll()
	if err != nil {
		return nil, nil, err
	}

	if len(allRows) == 0 {
		return nil, nil, errors.New("empty CSV file")
	}

	headers = allRows[0]
	rows = allRows[1:]

	return rows, headers, nil
}

func Writer(headers []string, rows []map[string]any) string {
	var content strings.Builder

	for i, col := range headers {
		content.WriteString(csvEscapeCell(col))

		if i < len(headers)-1 {
			content.WriteString(",")
		}
	}

	content.WriteString("\n")

	for _, row := range rows {
		for i := range headers {
			value := row[headers[i]]

			switch v := value.(type) {
			case nil:
				content.WriteString("NULL")
			default:
				strValue := fmt.Sprintf("%v", v)
				content.WriteString(csvEscapeCell(strValue))
			}

			if i < len(headers)-1 {
				content.WriteString(",")
			}
		}

		content.WriteString("\n")
	}

	return content.String()
}

// csvEscapeCell quotes the cell when needed and neutralizes spreadsheet
// formula injection: values starting with =, +, -, @, tab or CR would be
// interpreted as formulas by Excel/LibreOffice when the export is opened.
func csvEscapeCell(value string) string {
	if value == "" {
		return ""
	}

	if needsFormulaGuard(value) {
		value = "'" + value
	}

	if strings.ContainsAny(value, ",\"\n\r") {
		return fmt.Sprintf("\"%s\"", strings.ReplaceAll(value, "\"", "\"\""))
	}

	return value
}

func needsFormulaGuard(value string) bool {
	switch value[0] {
	case '=', '+', '-', '@', '\t', '\r':
		return true
	default:
		return false
	}
}
