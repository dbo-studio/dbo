package serviceBackup

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

// ErrUnsafeUpload means an uploaded SQL file holds client commands that could
// run programs or read files on the DBO host.
var ErrUnsafeUpload = errors.New("uploaded SQL file contains client commands that are not allowed")

// psql and mysql both run local commands from the input (\!, \o |cmd, system,
// source ...). A file the user brought is not trusted the way a pg_dump or
// mysqldump DBO ran itself is, so it is scanned before it reaches the client.
// The scan is deliberately stricter than the clients' own lexers: a backslash
// is only accepted before the characters dumps legitimately use.
var (
	// psqlAllowedEscapes are what follows a backslash in pg_dump output: COPY
	// escapes, the \. end marker, escaped strings, and \restrict keys.
	psqlAllowedEscapes = []byte(".N\\bfnrtvx0123456789'\"")
	// mysqlAllowedEscapes are mysqldump's string escapes.
	mysqlAllowedEscapes = []byte("0'\"bnrtZ\\%_")

	psqlSafeLines  = [][]byte{[]byte(`\restrict `), []byte(`\unrestrict `)}
	mysqlBlockWord = [][]byte{[]byte("system"), []byte("source"), []byte("tee"), []byte("pager"), []byte("edit"), []byte("prompt")}
)

// ScanUploadedSQL rejects an uploaded SQL file with client commands in it.
func ScanUploadedSQL(driver, path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}

	defer func() { _ = f.Close() }()

	postgres := databaseContract.IsPostgresFamily(driver)
	allowed := mysqlAllowedEscapes

	if postgres {
		allowed = psqlAllowedEscapes
	}

	r := bufio.NewReaderSize(f, 64*1024)
	atLineStart := true
	// pending is set when a chunk ends on a backslash, so the next chunk's
	// first byte is its pair.
	pending := false

	for {
		chunk, err := r.ReadSlice('\n')
		if err != nil && !errors.Is(err, bufio.ErrBufferFull) && !errors.Is(err, io.EOF) {
			return err
		}

		if atLineStart {
			if err := checkLineStart(chunk, postgres); err != nil {
				return err
			}

			chunk = trimSafeLine(chunk, postgres)
		}

		start := 0

		if pending && len(chunk) > 0 {
			if !escapeAllowed(allowed, chunk[0]) {
				return fmt.Errorf("%w: backslash command", ErrUnsafeUpload)
			}

			start = 1
		}

		pending = false

		for i := start; i < len(chunk); i++ {
			if chunk[i] != '\\' {
				continue
			}

			if i+1 == len(chunk) {
				pending = errors.Is(err, bufio.ErrBufferFull)

				break
			}

			if !escapeAllowed(allowed, chunk[i+1]) {
				return fmt.Errorf("%w: backslash command", ErrUnsafeUpload)
			}

			// An escape pair is consumed as one unit so "\\" is not re-read.
			i++
		}

		if errors.Is(err, io.EOF) {
			return nil
		}

		atLineStart = err == nil
	}
}

// trimSafeLine drops a whole \restrict / \unrestrict line from the scan.
func trimSafeLine(line []byte, postgres bool) []byte {
	if !postgres {
		return line
	}

	for _, prefix := range psqlSafeLines {
		if bytes.HasPrefix(line, prefix) {
			return nil
		}
	}

	return line
}

func checkLineStart(line []byte, postgres bool) error {
	if postgres {
		return nil
	}

	trimmed := bytes.ToLower(bytes.TrimLeft(line, " \t"))
	for _, word := range mysqlBlockWord {
		if bytes.HasPrefix(trimmed, word) && (len(trimmed) == len(word) || trimmed[len(word)] == ' ' || trimmed[len(word)] == '\t' || trimmed[len(word)] == ';') {
			return fmt.Errorf("%w: %s", ErrUnsafeUpload, string(word))
		}
	}

	return nil
}

func escapeAllowed(allowed []byte, c byte) bool {
	return c == '\n' || c == '\r' || bytes.IndexByte(allowed, c) >= 0
}
