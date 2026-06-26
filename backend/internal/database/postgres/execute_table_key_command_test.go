package databasePostgres

import (
	"encoding/json"
	"strings"
	"testing"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
)

func TestHandleTableKeyCommandsCreatePrimaryKey(t *testing.T) {
	t.Parallel()

	repo := &PostgresRepository{}
	node := contract.DBNode{Schema: "public", Table: "users"}

	payload, err := json.Marshal(map[string]any{
		"general": map[string]any{
			"new": map[string]any{
				"relname": "users",
			},
		},
		"table_keys": map[string]any{
			"columns": []map[string]any{
				{
					"new": map[string]any{
						"name":    "pk_users",
						"primary": true,
						"columns": []string{"id"},
					},
					"added": true,
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	queries, err := repo.handleTableKeyCommands(node, contract.TableKeysTab, contract.CreateTableAction, payload)
	if err != nil {
		t.Fatalf("handleTableKeyCommands: %v", err)
	}

	if len(queries) != 1 {
		t.Fatalf("expected 1 query, got %d: %v", len(queries), queries)
	}

	query := queries[0]
	for _, fragment := range []string{"ADD CONSTRAINT", "pk_users", "PRIMARY KEY", `"id"`} {
		if !strings.Contains(query, fragment) {
			t.Fatalf("expected query to contain %q, got %q", fragment, query)
		}
	}
}

func TestHandleTableKeyCommandsEditAddUnique(t *testing.T) {
	t.Parallel()

	repo := &PostgresRepository{}
	node := contract.DBNode{Schema: "public", Table: "users"}

	payload, err := json.Marshal(map[string]any{
		"table_keys": map[string]any{
			"columns": []map[string]any{
				{
					"new": map[string]any{
						"name":    "uniq_users_email",
						"primary": false,
						"columns": []string{"email"},
					},
					"added": true,
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	queries, err := repo.handleTableKeyCommands(node, contract.TableKeysTab, contract.EditTableAction, payload)
	if err != nil {
		t.Fatalf("handleTableKeyCommands: %v", err)
	}

	if len(queries) != 1 {
		t.Fatalf("expected 1 query, got %d: %v", len(queries), queries)
	}

	query := queries[0]
	for _, fragment := range []string{"ADD CONSTRAINT", "uniq_users_email", "UNIQUE", `"email"`} {
		if !strings.Contains(query, fragment) {
			t.Fatalf("expected query to contain %q, got %q", fragment, query)
		}
	}
}

func TestHandleTableKeyCommandsEditDropKey(t *testing.T) {
	t.Parallel()

	repo := &PostgresRepository{}
	node := contract.DBNode{Schema: "public", Table: "users"}

	payload, err := json.Marshal(map[string]any{
		"table_keys": map[string]any{
			"columns": []map[string]any{
				{
					"new": map[string]any{
						"name": lo.ToPtr("uniq_users_email"),
					},
					"old": map[string]any{
						"name": "uniq_users_email",
					},
					"deleted": true,
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	queries, err := repo.handleTableKeyCommands(node, contract.TableKeysTab, contract.EditTableAction, payload)
	if err != nil {
		t.Fatalf("handleTableKeyCommands: %v", err)
	}

	if len(queries) != 1 {
		t.Fatalf("expected 1 query, got %d: %v", len(queries), queries)
	}

	if !strings.Contains(queries[0], "DROP CONSTRAINT uniq_users_email") {
		t.Fatalf("expected DROP CONSTRAINT query, got %q", queries[0])
	}
}
