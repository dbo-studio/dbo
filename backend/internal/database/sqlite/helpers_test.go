package databaseSqlite

import (
	"database/sql"
	"testing"
)

func TestColumnListToResponseNotNull(t *testing.T) {
	t.Parallel()

	columns := []Column{
		{
			ColumnName:   "id",
			DataType:     "INTEGER",
			IsNullable:   "0", // is_nullable=0 → NOT NULL
			IsPrimaryKey: "1",
		},
		{
			ColumnName: "note",
			DataType:   "TEXT",
			IsNullable: "1", // nullable
			ColumnDefault: sql.NullString{
				Valid: false,
			},
		},
	}

	got := columnListToResponse(columns)
	if len(got) != 2 {
		t.Fatalf("len: got %d", len(got))
	}

	if !got[0].NotNull {
		t.Fatalf("id NotNull: got false, want true")
	}

	if got[1].NotNull {
		t.Fatalf("note NotNull: got true, want false")
	}
}
