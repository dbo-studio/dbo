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
		content.WriteString(col)
		if i < len(headers)-1 {
			content.WriteString(",")
		}
	}
	content.WriteString("\n")

	for _, row := range rows {
		for i := range headers {
			value := row[headers[i]]

			if value != "" && value != nil {
				// Escape quotes in CSV
				strValue := fmt.Sprintf("%v", value)
				if strings.Contains(strValue, ",") || strings.Contains(strValue, "\"") || strings.Contains(strValue, "\n") {
					strValue = fmt.Sprintf("\"%s\"", strings.ReplaceAll(strValue, "\"", "\"\""))
				}
				content.WriteString(strValue)
			}

			if value == "" {
				content.WriteString("")
			}

			if value == nil {
				content.WriteString("NULL")
			}

			if i < len(headers)-1 {
				content.WriteString(",")
			}
		}
		content.WriteString("\n")
	}

	return content.String()
}
