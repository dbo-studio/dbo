package serviceBackup

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"regexp"
	"strings"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

// A restore test copies a backup into a throwaway database and drops it again. Dropping a database
// is the one step here that cannot be undone, so every statement that creates or drops one goes
// through this file and refuses any name that is not a scratch name this code made.

var drillNamePattern = regexp.MustCompile(`^dbo_drill_[0-9]+_[0-9a-f]{8}$`)

var ErrNotDrillDatabase = errors.New("refusing to touch a database that is not a restore-test scratch database")

// DrillDatabaseName makes a scratch name no real database is likely to have.
func DrillDatabaseName(artifactID uint) (string, error) {
	suffix := make([]byte, 4)
	if _, err := rand.Read(suffix); err != nil {
		return "", err
	}

	return fmt.Sprintf("dbo_drill_%d_%s", artifactID, hex.EncodeToString(suffix)), nil
}

// IsDrillDatabase reports whether name is a scratch name made by DrillDatabaseName.
func IsDrillDatabase(name string) bool { return drillNamePattern.MatchString(name) }

func quoteDrill(driver, name string) string {
	if databaseContract.IsPostgresFamily(driver) {
		return `"` + name + `"`
	}

	return "`" + name + "`"
}

// CreateDrillSQL is the statement that makes a scratch database.
func CreateDrillSQL(driver, name string) (string, error) {
	if !IsDrillDatabase(name) {
		return "", ErrNotDrillDatabase
	}

	return "CREATE DATABASE " + quoteDrill(driver, name), nil
}

// DropDrillSQL is the statement that removes a scratch database. force also ends connections still
// open to it (Postgres 13 and later), so a stuck client cannot keep it alive.
func DropDrillSQL(driver, name string, force bool) (string, error) {
	if !IsDrillDatabase(name) {
		return "", ErrNotDrillDatabase
	}

	statement := "DROP DATABASE " + quoteDrill(driver, name)
	if force && databaseContract.IsPostgresFamily(driver) {
		statement += " WITH (FORCE)"
	}

	return statement, nil
}

func sqlString(s string) string { return "'" + strings.ReplaceAll(s, "'", "''") + "'" }

// TableCountSQL counts the base tables a backup should have restored: those of one schema (Postgres)
// or database (MySQL), or every user schema when a Postgres backup covers the whole database.
func TableCountSQL(driver, database, schema string) string {
	const base = "SELECT count(*) FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND "

	if !databaseContract.IsPostgresFamily(driver) {
		return base + "table_schema = " + sqlString(database)
	}

	if schema != "" {
		return base + "table_schema = " + sqlString(schema)
	}

	return base + "table_schema NOT IN ('pg_catalog', 'information_schema') AND table_schema NOT LIKE 'pg_toast%'"
}

// CountCreateTables counts the CREATE TABLE statements in a SQL dump: the number of tables a restore
// must produce. It reads line by line without holding a line, as data lines can be very long.
func CountCreateTables(path string) (int, error) {
	f, err := os.Open(path)
	if err != nil {
		return 0, err
	}

	defer func() { _ = f.Close() }()

	reader := bufio.NewReaderSize(f, 1<<20)
	count, atLineStart := 0, true

	for {
		line, isPrefix, err := reader.ReadLine()
		if err == io.EOF {
			return count, nil
		}

		if err != nil {
			return 0, err
		}

		if atLineStart && strings.HasPrefix(string(line), "CREATE TABLE ") {
			count++
		}

		atLineStart = !isPrefix
	}
}
