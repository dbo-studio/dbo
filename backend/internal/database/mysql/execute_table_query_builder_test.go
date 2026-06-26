package databaseMysql

import (
	"encoding/json"
	"testing"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func TestBuildMysqlCreateTableQuery(t *testing.T) {
	t.Parallel()

	payload := map[string]any{
		"general": map[string]any{
			"new": map[string]any{
				"relname": "users_test",
			},
			"old": map[string]any{},
		},
		"table_columns": map[string]any{
			"columns": []map[string]any{
				{
					"new": map[string]any{
						"column_name": "id",
						"data_type":   "INT",
					},
					"old":   map[string]any{},
					"added": true,
				},
				{
					"new": map[string]any{
						"column_name": "email",
						"data_type":   "VARCHAR",
					},
					"old":   map[string]any{},
					"added": true,
				},
			},
		},
		"table_keys": map[string]any{
			"columns": []map[string]any{
				{
					"new": map[string]any{
						"constraint_name": "pk_users",
						"ref_columns":     []string{"id"},
						"constraint_type": "PRIMARY KEY",
					},
					"old":   map[string]any{},
					"added": true,
				},
			},
		},
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	node := contract.DBNode{Database: "default"}
	query, tableName, err := buildMysqlCreateTableQuery(node, raw)
	if err != nil {
		t.Fatalf("buildMysqlCreateTableQuery: %v", err)
	}

	if tableName != "users_test" {
		t.Fatalf("tableName = %q", tableName)
	}

	want := "CREATE TABLE `default`.`users_test` (`id` INT, `email` VARCHAR, PRIMARY KEY (`id`))"
	if query != want {
		t.Fatalf("query = %q, want %q", query, want)
	}
}
