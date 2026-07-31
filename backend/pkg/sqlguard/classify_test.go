package sqlguard

import "testing"

func TestClassifySQL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		sql  string
		want Class
	}{
		{name: "select", sql: "SELECT * FROM users", want: ClassRead},
		{name: "with select", sql: "WITH cte AS (SELECT 1) SELECT * FROM cte", want: ClassRead},
		{name: "explain", sql: "EXPLAIN SELECT 1", want: ClassRead},
		{name: "insert", sql: "INSERT INTO users (id) VALUES (1)", want: ClassWriteDML},
		{name: "update with where", sql: "UPDATE users SET name = 'a' WHERE id = 1", want: ClassWriteDML},
		{name: "update without where", sql: "UPDATE users SET name = 'a'", want: ClassDangerousDML},
		{name: "delete with where", sql: "DELETE FROM users WHERE id = 1", want: ClassWriteDML},
		{name: "delete without where", sql: "DELETE FROM users", want: ClassDangerousDML},
		{name: "create table", sql: "CREATE TABLE t (id INT)", want: ClassDDL},
		{name: "alter table", sql: "ALTER TABLE users ADD COLUMN x INT", want: ClassDDL},
		{name: "drop table", sql: "DROP TABLE users", want: ClassCatastrophicDDL},
		{name: "truncate", sql: "TRUNCATE TABLE users", want: ClassCatastrophicDDL},
		{name: "batch highest wins", sql: "SELECT 1; DROP TABLE users", want: ClassCatastrophicDDL},
		{name: "empty", sql: "   ", want: ClassUnknown},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := ClassifySQL(tt.sql)
			if got.Class != tt.want {
				t.Fatalf("ClassifySQL(%q) = %s, want %s", tt.sql, got.Class, tt.want)
			}
		})
	}
}

func TestClassifyAction(t *testing.T) {
	t.Parallel()

	tests := []struct {
		action string
		want   Class
	}{
		{action: "dropTable", want: ClassCatastrophicDDL},
		{action: "dropDatabase", want: ClassCatastrophicDDL},
		{action: "dropIndex", want: ClassDDL},
		{action: "createTable", want: ClassDDL},
		{action: "editTable", want: ClassDDL},
		{action: "refresh", want: ClassUnknown},
	}

	for _, tt := range tests {
		t.Run(tt.action, func(t *testing.T) {
			t.Parallel()
			if got := ClassifyAction(tt.action); got != tt.want {
				t.Fatalf("ClassifyAction(%q) = %s, want %s", tt.action, got, tt.want)
			}
		})
	}
}
