package databaseMysql

import (
	"encoding/json"
	"strings"
	"testing"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func TestHandleEditAddColumnQuery(t *testing.T) {
	t.Parallel()

	payload := map[string]any{
		"table_columns": map[string]any{
			"columns": []map[string]any{
				{
					"new": map[string]any{
						"column_name": "notes",
						"data_type":   "VARCHAR",
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

	queries, err := repo.handleTableColumnCommands(node, contract.TableColumnsTab, contract.EditTableAction, raw)
	if err != nil {
		t.Fatalf("handleTableColumnCommands: %v", err)
	}

	if len(queries) != 1 {
		t.Fatalf("queries = %#v, want 1 query", queries)
	}

	if !strings.Contains(queries[0], "ADD COLUMN") {
		t.Fatalf("query = %q", queries[0])
	}

	if !strings.Contains(queries[0], "VARCHAR(255)") {
		t.Fatalf("query = %q, want VARCHAR(255) default length", queries[0])
	}
}
