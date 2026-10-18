package databasePostgres

import (
	"reflect"
	"testing"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
)

func TestEditMaterializedViewQueries(t *testing.T) {
	node := contract.DBNode{Schema: "public", Table: "mv"}
	data := func(query, comment string) *dto.PostgresMaterializedViewData {
		return &dto.PostgresMaterializedViewData{Name: lo.ToPtr("mv"), Query: lo.ToPtr(query), Comment: lo.ToPtr(comment)}
	}

	got := editMaterializedViewQueries(node, &dto.PostgresMaterializedViewParams{
		Old: data("SELECT 1", ""), New: data("SELECT 1", "hi"),
	})
	want := []string{`COMMENT ON MATERIALIZED VIEW "public"."mv" IS 'hi'`}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %q", got)
	}

	got = editMaterializedViewQueries(node, &dto.PostgresMaterializedViewParams{
		Old: data("SELECT 1", ""), New: data("SELECT 2", ""),
	})
	want = []string{`DROP MATERIALIZED VIEW "public"."mv"`, `CREATE MATERIALIZED VIEW "public"."mv" AS SELECT 2`}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %q", got)
	}
}
