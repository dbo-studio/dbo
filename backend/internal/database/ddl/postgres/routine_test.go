package ddlPostgres

import (
	"reflect"
	"testing"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

func TestRoutineEdit(t *testing.T) {
	data := func(params, returns, body string) *dto.RoutineData {
		return &dto.RoutineData{Name: lo.ToPtr("f"), Language: lo.ToPtr("sql"), Parameters: lo.ToPtr(params), Returns: lo.ToPtr(returns), Body: lo.ToPtr(body)}
	}

	same := sqls(BuildRoutineEdit(RoutineInput{Schema: "public", Old: data("a integer", "integer", "SELECT 1"), New: data("a integer", "integer", "SELECT 2")}))
	if want := []string{`CREATE OR REPLACE FUNCTION "public"."f"(a integer) RETURNS integer LANGUAGE sql AS $body$SELECT 2$body$`}; !reflect.DeepEqual(same, want) {
		t.Fatalf("got %q", same)
	}

	changed := sqls(BuildRoutineEdit(RoutineInput{Schema: "public", OldIdentity: "integer", Old: data("a integer DEFAULT 1", "integer", "SELECT 1"), New: data("a integer", "integer", "SELECT '$body$'")}))
	want := []string{
		`DROP FUNCTION "public"."f"(integer)`,
		`CREATE FUNCTION "public"."f"(a integer) RETURNS integer LANGUAGE sql AS $bodyx$SELECT '$body$'$bodyx$`,
	}
	if !reflect.DeepEqual(changed, want) {
		t.Fatalf("got %q", changed)
	}

	proc := sqls(BuildRoutineCreate(RoutineInput{Schema: "public", Procedure: true, New: &dto.RoutineData{Name: lo.ToPtr("p"), Body: lo.ToPtr("BEGIN END")}}))
	if want := []string{`CREATE PROCEDURE "public"."p"() LANGUAGE plpgsql AS $body$BEGIN END$body$`}; !reflect.DeepEqual(proc, want) {
		t.Fatalf("got %q", proc)
	}

	if got := BuildRoutineCreate(RoutineInput{Schema: "public", New: data("a integer; DROP", "integer", "x")}); got != nil {
		t.Fatalf("expected rejection, got %v", got)
	}
}
