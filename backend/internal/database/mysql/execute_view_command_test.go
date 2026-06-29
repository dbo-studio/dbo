package databaseMysql

import (
	"testing"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func TestResolveMysqlTableNodeEditViewSingleSegmentNodeID(t *testing.T) {
	repo := &MySQLRepository{}

	node := repo.resolveMysqlTableNode(contract.DBNode{Database: "v_posts_test"}, contract.EditViewAction)

	if node.Database != "default" {
		t.Fatalf("expected database default, got %q", node.Database)
	}
	if node.Table != "v_posts_test" {
		t.Fatalf("expected table v_posts_test, got %q", node.Table)
	}
}

func TestResolveMysqlTableNodeEditViewQualifiedNodeID(t *testing.T) {
	repo := &MySQLRepository{}

	node := repo.resolveMysqlTableNode(
		contract.DBNode{Database: "default", Table: "v_posts_test"},
		contract.EditViewAction,
	)

	if node.Database != "default" || node.Table != "v_posts_test" {
		t.Fatalf("unexpected node: %+v", node)
	}
}
