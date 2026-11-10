package serviceDashboard

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"html/template"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/goccy/go-json"
)

const (
	summaryRows     = 20
	webhookRowLimit = 1000
)

var unsafeFileChars = regexp.MustCompile(`[^A-Za-z0-9._-]+`)

func cellText(value any) string {
	switch v := value.(type) {
	case nil:
		return ""
	case string:
		// A spreadsheet runs a cell that starts like a formula; a leading quote keeps it text.
		if v != "" && strings.ContainsRune("=+@", rune(v[0])) {
			return "'" + v
		}

		return v
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case bool:
		return strconv.FormatBool(v)
	default:
		encoded, _ := json.Marshal(v)

		return string(encoded)
	}
}

func resultColumns(result *dto.PublicResult) []string {
	columns := make([]string, 0, len(result.Columns))
	for _, column := range result.Columns {
		columns = append(columns, column.Name)
	}

	return columns
}

func toCSV(result *dto.PublicResult) []byte {
	var out bytes.Buffer

	writer := csv.NewWriter(&out)
	columns := resultColumns(result)
	_ = writer.Write(columns)

	for _, row := range result.Rows {
		cells := make([]string, len(columns))
		for i, column := range columns {
			cells[i] = cellText(row[column])
		}

		_ = writer.Write(cells)
	}

	writer.Flush()

	return out.Bytes()
}

// csvFiles is one attachment per report that ran, named after the report; equal names get a number.
func csvFiles(cards []dto.PublicCardResponse) []attachment {
	var files []attachment

	used := map[string]int{}

	for _, card := range cards {
		if card.Result == nil {
			continue
		}

		base := strings.Trim(unsafeFileChars.ReplaceAllString(card.Name, "_"), "._-")
		if base == "" {
			base = "report"
		}

		used[base]++
		if used[base] > 1 {
			base = fmt.Sprintf("%s-%d", base, used[base])
		}

		files = append(files, attachment{Name: base + ".csv", Data: toCSV(card.Result)})
	}

	return files
}

func okCards(cards []dto.PublicCardResponse) int {
	count := 0

	for _, card := range cards {
		if card.Result != nil {
			count++
		}
	}

	return count
}

var summaryTemplate = template.Must(template.New("summary").Parse(`<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1f2933">
<h2 style="margin:0 0 4px">{{.Name}}</h2>
<p style="margin:0 0 16px;color:#616e7c">{{.At}}</p>
{{range .Cards}}
<h3 style="margin:16px 0 4px">{{.Name}}</h3>
{{if .Error}}<p style="color:#b42318">{{.Error}}</p>{{else}}
<table style="border-collapse:collapse;font-size:13px">
<tr>{{range .Columns}}<th style="text-align:left;border-bottom:1px solid #cbd2d9;padding:4px 10px">{{.}}</th>{{end}}</tr>
{{range .Rows}}<tr>{{range .}}<td style="padding:4px 10px;border-bottom:1px solid #e4e7eb">{{.}}</td>{{end}}</tr>
{{end}}</table>
{{if .More}}<p style="color:#616e7c;font-size:12px">{{.More}}</p>{{end}}
{{end}}{{end}}
<p style="margin-top:24px;color:#9aa5b1;font-size:12px">Sent by DBO Studio. The full results are attached as CSV.</p>
</body></html>`))

type summaryCard struct {
	Name, Error, More string
	Columns           []string
	Rows              [][]string
}

// summaryHTML shows the first rows of each report; the CSV attachments hold all of them.
func summaryHTML(name string, at time.Time, cards []dto.PublicCardResponse) (string, error) {
	view := struct {
		Name, At string
		Cards    []summaryCard
	}{Name: name, At: at.Format("Mon, 02 Jan 2006 15:04 MST")}

	for _, card := range cards {
		out := summaryCard{Name: card.Name, Error: card.Error}

		if card.Result != nil {
			out.Columns = resultColumns(card.Result)

			for i, row := range card.Result.Rows {
				if i == summaryRows {
					out.More = fmt.Sprintf("Showing %d of %d rows.", summaryRows, len(card.Result.Rows))

					break
				}

				cells := make([]string, len(out.Columns))
				for j, column := range out.Columns {
					cells[j] = cellText(row[column])
				}

				out.Rows = append(out.Rows, cells)
			}
		}

		view.Cards = append(view.Cards, out)
	}

	var out bytes.Buffer
	if err := summaryTemplate.Execute(&out, view); err != nil {
		return "", err
	}

	return out.String(), nil
}

// webhookBody is the snapshot as JSON: each report's columns and rows, cut at webhookRowLimit rows.
func webhookBody(dashboardID uint, name string, at time.Time, cards []dto.PublicCardResponse) ([]byte, error) {
	type card struct {
		Name      string           `json:"name"`
		Columns   []string         `json:"columns,omitempty"`
		Rows      []map[string]any `json:"rows,omitempty"`
		Truncated bool             `json:"truncated,omitempty"`
		Error     string           `json:"error,omitempty"`
	}

	body := struct {
		Event       string    `json:"event"`
		Dashboard   any       `json:"dashboard"`
		GeneratedAt time.Time `json:"generatedAt"`
		Cards       []card    `json:"cards"`
	}{
		Event:       "dashboard.snapshot",
		Dashboard:   map[string]any{"id": dashboardID, "name": name},
		GeneratedAt: at,
		Cards:       []card{},
	}

	for _, source := range cards {
		out := card{Name: source.Name, Error: source.Error}

		if source.Result != nil {
			out.Columns = resultColumns(source.Result)
			out.Rows = source.Result.Rows

			if len(out.Rows) > webhookRowLimit {
				out.Rows, out.Truncated = out.Rows[:webhookRowLimit], true
			}
		}

		body.Cards = append(body.Cards, out)
	}

	return json.Marshal(body)
}
