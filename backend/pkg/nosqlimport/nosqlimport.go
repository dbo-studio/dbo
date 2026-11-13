// Package nosqlimport reads documents out of an uploaded file, one at a time, so a large file is never held in memory.
package nosqlimport

import (
	"bufio"
	"bytes"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
)

const (
	// MaxLine is the longest NDJSON line (one document) read.
	MaxLine = 16 << 20

	FormatNDJSON = "ndjson"
	FormatJSON   = "json"
	FormatCSV    = "csv"
)

var ErrFormat = errors.New("format must be ndjson, json or csv")

// counter counts the bytes read through it, for progress.
type counter struct {
	r io.Reader
	n int64
}

func (c *counter) Read(p []byte) (int, error) {
	n, err := c.r.Read(p)
	c.n += int64(n)

	return n, err
}

// Docs reads every document in r and calls emit with each as JSON text. progress, when set, gets the bytes read so far.
// Reading stops at the first error from emit or from the file.
func Docs(r io.Reader, format string, emit func(doc string) error, progress func(read int64)) error {
	c := &counter{r: r}
	tick := func() {
		if progress != nil {
			progress(c.n)
		}
	}

	switch format {
	case FormatNDJSON:
		sc := bufio.NewScanner(c)
		sc.Buffer(make([]byte, 0, 64<<10), MaxLine)

		for line := 1; sc.Scan(); line++ {
			text := strings.TrimSpace(sc.Text())
			if text == "" {
				continue
			}

			if !json.Valid([]byte(text)) {
				return fmt.Errorf("line %d is not valid JSON", line)
			}

			if err := emit(text); err != nil {
				return err
			}

			tick()
		}

		return sc.Err()
	case FormatJSON:
		dec := json.NewDecoder(bufio.NewReader(c))

		tok, err := dec.Token()
		if err != nil {
			return fmt.Errorf("expected a JSON array of documents: %w", err)
		}

		if d, ok := tok.(json.Delim); !ok || d != '[' {
			return errors.New("expected a JSON array of documents")
		}

		for i := 1; dec.More(); i++ {
			var raw json.RawMessage
			if err := dec.Decode(&raw); err != nil {
				return fmt.Errorf("item %d: %w", i, err)
			}

			if !bytes.HasPrefix(bytes.TrimSpace(raw), []byte("{")) {
				return fmt.Errorf("item %d is not a document", i)
			}

			if err := emit(string(raw)); err != nil {
				return err
			}

			tick()
		}

		return nil
	case FormatCSV:
		cr := csv.NewReader(bufio.NewReader(c))
		cr.FieldsPerRecord = -1

		header, err := cr.Read()
		if err != nil {
			return fmt.Errorf("the first row must name the columns: %w", err)
		}

		for i := 2; ; i++ {
			rec, err := cr.Read()
			if errors.Is(err, io.EOF) {
				return nil
			}

			if err != nil {
				return fmt.Errorf("row %d: %w", i, err)
			}

			doc, err := csvDoc(header, rec)
			if err != nil {
				return fmt.Errorf("row %d: %w", i, err)
			}

			if doc == "" {
				continue
			}

			if err := emit(doc); err != nil {
				return err
			}

			tick()
		}
	}

	return ErrFormat
}

// csvDoc builds one document from a row. A dotted column name (address.city) becomes a nested field, an empty cell
// leaves the field out, and a cell reads as a number, true, false, or JSON when it is one; anything else is text.
func csvDoc(header, rec []string) (string, error) {
	doc := map[string]any{}

	for i, name := range header {
		if i >= len(rec) || rec[i] == "" || strings.TrimSpace(name) == "" {
			continue
		}

		set(doc, strings.Split(name, "."), cell(rec[i]))
	}

	if len(doc) == 0 {
		return "", nil
	}

	b, err := json.Marshal(doc)

	return string(b), err
}

func set(doc map[string]any, path []string, v any) {
	for _, seg := range path[:len(path)-1] {
		next, ok := doc[seg].(map[string]any)
		if !ok {
			next = map[string]any{}
			doc[seg] = next
		}

		doc = next
	}

	doc[path[len(path)-1]] = v
}

func cell(s string) any {
	switch s {
	case "true":
		return true
	case "false":
		return false
	}

	if (strings.HasPrefix(s, "{") || strings.HasPrefix(s, "[")) && json.Valid([]byte(s)) {
		return json.RawMessage(s)
	}

	if n, err := strconv.ParseInt(s, 10, 64); err == nil && strconv.FormatInt(n, 10) == s {
		return n
	}

	if f, err := strconv.ParseFloat(s, 64); err == nil && !strings.ContainsAny(s, "eEnNiI_x") {
		return f
	}

	return s
}
