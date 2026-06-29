package databaseSqlite

import (
	"strings"
	"testing"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

func TestBuildCreateTableQuery(t *testing.T) {
	t.Parallel()

	repo := &SQLiteRepository{}
	name := loPtr("users_test")
	query := repo.buildCreateTableQuery(`"users_test"`, &dto.SQLiteTableParamsData{Name: name}, `"id" INTEGER PRIMARY KEY`)

	if !strings.Contains(query, "CREATE TABLE") {
		t.Fatalf("query = %q", query)
	}

	if !strings.Contains(query, `"id" INTEGER PRIMARY KEY`) {
		t.Fatalf("query = %q", query)
	}
}

func loPtr[T any](v T) *T {
	return &v
}
