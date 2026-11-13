package serviceNoSQL

import (
	"bufio"
	"context"
	"encoding/csv"
	"fmt"
	"sort"
	"strconv"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	serviceDbtools "github.com/dbo-studio/dbo/internal/service/dbtools"
	"github.com/goccy/go-json"
)

// csvHeaderSample is how many documents are read to decide the CSV's columns before any row is written.
const csvHeaderSample = 500

// WriteCSV streams an export as CSV. The columns are the fields of the first documents, so a field that only appears
// in a later document is left out; the second return value is how many such fields there were.
func WriteCSV(ctx context.Context, it contract.ExportIter, w *bufio.Writer) (int, error) {
	var (
		rows   []map[string]any
		order  []string
		seen   = map[string]bool{}
		header []string
	)

	read := func() (map[string]any, bool, error) {
		line, ok, err := it.Next(ctx)
		if err != nil || !ok {
			return nil, false, err
		}

		var doc map[string]any
		if err := json.Unmarshal([]byte(line), &doc); err != nil {
			return nil, false, err
		}

		return serviceDbtools.FlattenDocument(doc), true, nil
	}

	for len(rows) < csvHeaderSample {
		row, ok, err := read()
		if err != nil {
			return 0, err
		}

		if !ok {
			break
		}

		rows = append(rows, row)

		for k := range row {
			if !seen[k] {
				seen[k] = true

				order = append(order, k)
			}
		}
	}

	// _id first, then the rest in name order, so the file does not depend on map order.
	sort.Strings(order)

	for _, k := range order {
		if k == "_id" {
			header = append([]string{k}, header...)
		} else {
			header = append(header, k)
		}
	}

	cw := csv.NewWriter(w)
	if err := cw.Write(header); err != nil {
		return 0, err
	}

	dropped := 0
	write := func(row map[string]any) error {
		rec := make([]string, len(header))
		for i, k := range header {
			rec[i] = cellText(row[k])
		}

		for k := range row {
			if !seen[k] {
				dropped++
			}
		}

		return cw.Write(rec)
	}

	for _, row := range rows {
		if err := write(row); err != nil {
			return dropped, err
		}
	}

	for {
		row, ok, err := read()
		if err != nil || !ok {
			cw.Flush()

			if err == nil {
				err = cw.Error()
			}

			return dropped, err
		}

		if err := write(row); err != nil {
			return dropped, err
		}
	}
}

func cellText(v any) string {
	switch x := v.(type) {
	case nil:
		return ""
	case string:
		return x
	case bool:
		return strconv.FormatBool(x)
	case float64:
		return strconv.FormatFloat(x, 'f', -1, 64)
	default:
		return fmt.Sprint(x)
	}
}
