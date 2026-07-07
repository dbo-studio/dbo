package databaseCore

import (
	"testing"

	"github.com/samber/lo"
)

func TestAnalyzeUpdatableQuery_SingleTableStar(t *testing.T) {
	t.Parallel()

	analysis := AnalyzeUpdatableQuery("SELECT * FROM users", nil, nil)

	if !analysis.IsSelect {
		t.Fatal("expected select query")
	}
	if analysis.HasJoin {
		t.Fatal("expected no join")
	}
	if len(analysis.Tables) != 1 || analysis.Tables[0].Name != "users" {
		t.Fatalf("unexpected tables: %+v", analysis.Tables)
	}
	if analysis.EditableReason() != "" {
		t.Fatalf("expected editable analysis, got reason: %s", analysis.EditableReason())
	}
}

func TestAnalyzeUpdatableQuery_JoinQualifiedColumns(t *testing.T) {
	t.Parallel()

	analysis := AnalyzeUpdatableQuery(
		"SELECT u.id, u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id",
		nil,
		nil,
	)

	if !analysis.HasJoin {
		t.Fatal("expected join")
	}
	if !analysis.IsColumnFromDrivingTable("name") {
		t.Fatal("expected name to belong to driving table")
	}
	if analysis.IsColumnFromDrivingTable("total") {
		t.Fatal("expected total to belong to joined table")
	}
}

func TestAnalyzeUpdatableQuery_AmbiguousJoinColumn(t *testing.T) {
	t.Parallel()

	analysis := AnalyzeUpdatableQuery(
		"SELECT id FROM users u JOIN orders o ON u.id = o.user_id",
		nil,
		nil,
	)

	if analysis.EditableReason() == "" {
		t.Fatal("expected ambiguous column reason")
	}
}

func TestAnalyzeUpdatableQuery_AggregateNotEditable(t *testing.T) {
	t.Parallel()

	analysis := AnalyzeUpdatableQuery("SELECT count(*) FROM users", nil, nil)

	if !analysis.HasAggregate {
		t.Fatal("expected aggregate")
	}
	if analysis.EditableReason() == "" {
		t.Fatal("expected non-editable reason")
	}
}

func TestAnalyzeUpdatableQuery_WithSchemaQualifier(t *testing.T) {
	t.Parallel()

	analysis := AnalyzeUpdatableQuery("SELECT * FROM public.users", lo.ToPtr("mydb"), lo.ToPtr("public"))

	if analysis.Tables[0].Schema != "public" {
		t.Fatalf("expected public schema, got %+v", analysis.Tables[0])
	}
}
