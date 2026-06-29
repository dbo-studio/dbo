package databaseMysql

import (
	"encoding/json"
	"strings"
	"testing"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func TestHandleEditAddPrimaryKeyQuery(t *testing.T) {
	t.Parallel()

	payload := map[string]any{
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

	repo := &MySQLRepository{}
	node := contract.DBNode{Database: "default", Table: "users_test"}

	queries, err := repo.handleTableKeyCommands(node, contract.TableKeysTab, contract.EditTableAction, raw)
	if err != nil {
		t.Fatalf("handleTableKeyCommands: %v", err)
	}

	if len(queries) != 1 {
		t.Fatalf("queries = %#v, want 1 query", queries)
	}

	if !strings.Contains(queries[0], "ADD PRIMARY KEY") {
		t.Fatalf("query = %q", queries[0])
	}
}

func TestHandleEditAddForeignKeyQuery(t *testing.T) {
	t.Parallel()

	payload := map[string]any{
		"table_foreign_keys": map[string]any{
			"columns": []map[string]any{
				{
					"new": map[string]any{
						"constraint_name": "fk_posts_user",
						"ref_columns":     []string{"user_id"},
						"target_table":    "users_test",
						"target_columns":  []string{"id"},
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

	repo := &MySQLRepository{}
	node := contract.DBNode{Database: "default", Table: "posts_test"}

	queries, err := repo.handleForeignKeyCommands(node, contract.TableForeignKeysTab, contract.EditTableAction, raw)
	if err != nil {
		t.Fatalf("handleForeignKeyCommands: %v", err)
	}

	if len(queries) != 1 {
		t.Fatalf("queries = %#v, want 1 query", queries)
	}

	if !strings.Contains(queries[0], "FOREIGN KEY") {
		t.Fatalf("query = %q", queries[0])
	}
}
