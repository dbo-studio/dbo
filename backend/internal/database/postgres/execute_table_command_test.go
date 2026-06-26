package databasePostgres

import (
	"encoding/json"
	"testing"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
)

func TestHandleTableCommandsUsesGeneralPayloadKey(t *testing.T) {
	t.Parallel()

	repo := &PostgresRepository{}
	node := contract.DBNode{Schema: "public"}

	payload, err := json.Marshal(map[string]any{
		"general": map[string]any{
			"new": map[string]any{
				"relname": "users",
			},
			"old": map[string]any{},
		},
	})
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	queries, tableName, err := repo.handleTableCommands(node, contract.GeneralTab, contract.CreateTableAction, payload)
	if err != nil {
		t.Fatalf("handleTableCommands: %v", err)
	}

	if tableName != "users" {
		t.Fatalf("expected table name users, got %q", tableName)
	}
	if len(queries) == 0 {
		t.Fatal("expected create table query")
	}
}

func TestResolveCreateTableNodeUsesGeneralPayloadKey(t *testing.T) {
	t.Parallel()

	node := contract.DBNode{
		Schema: "public",
		Table:  string(contract.TableContainerNodeType),
	}

	payload, err := json.Marshal(map[contract.TreeTab]*dto.PostgresTableParams{
		contract.GeneralTab: {
			New: &dto.PostgresTableParamsData{
				Name: lo.ToPtr("posts"),
			},
		},
	})
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	resolved := resolveCreateTableNode(node, contract.CreateTableAction, payload)
	if resolved.Table != "posts" {
		t.Fatalf("expected table posts, got %q", resolved.Table)
	}
}
