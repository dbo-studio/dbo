package ddlPostgres

import (
	"reflect"
	"testing"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	"github.com/samber/lo"
)

func sqls(statements []ddl.Statement) []string {
	var out []string
	for _, s := range statements {
		out = append(out, s.SQL)
	}

	return out
}

func TestCheckStatements(t *testing.T) {
	check := func(name, expr string) *dto.PostgresTableCheckData {
		return &dto.PostgresTableCheckData{Name: lo.ToPtr(name), Expression: lo.ToPtr(expr)}
	}

	got := sqls(checkStatements("public", "t", []dto.PostgresTableCheck{
		{New: check("c_new", "age > 0"), Added: lo.ToPtr(true)},
		{Old: check("c_old", "a > 0"), New: check("c_old", "a > 1")},
		{Old: check("c_gone", "a > 0"), New: check("c_gone", "a > 0"), Deleted: lo.ToPtr(true)},
		{New: check("c_bad", "a > 0; DROP TABLE t"), Added: lo.ToPtr(true)},
	}, contract.EditTableAction))

	want := []string{
		`ALTER TABLE "public"."t" ADD CONSTRAINT "c_new" CHECK (age > 0)`,
		`ALTER TABLE "public"."t" DROP CONSTRAINT "c_old"`,
		`ALTER TABLE "public"."t" ADD CONSTRAINT "c_old" CHECK (a > 1)`,
		`ALTER TABLE "public"."t" DROP CONSTRAINT "c_gone"`,
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %q", got)
	}
}

func TestTriggerStatements(t *testing.T) {
	trigger := func(name string, events ...string) *dto.PostgresTableTriggerData {
		return &dto.PostgresTableTriggerData{
			Name: lo.ToPtr(name), Timing: lo.ToPtr("before"), Events: events,
			Orientation: lo.ToPtr("ROW"), Function: lo.ToPtr("public.audit"), When: lo.ToPtr("NEW.a IS NOT NULL"),
		}
	}

	got := sqls(triggerStatements("public", "t", []dto.PostgresTableTrigger{
		{New: trigger("tg", "UPDATE", "INSERT"), Added: lo.ToPtr(true)},
		{Old: trigger("a", "INSERT"), New: trigger("b", "INSERT")},
		{Old: trigger("c", "INSERT"), New: trigger("c", "INSERT", "DELETE")},
		{Old: trigger("d", "INSERT"), New: trigger("d", "INSERT"), Deleted: lo.ToPtr(true)},
	}, contract.EditTableAction))

	want := []string{
		`CREATE TRIGGER "tg" BEFORE INSERT OR UPDATE ON "public"."t" FOR EACH ROW WHEN (NEW.a IS NOT NULL) EXECUTE FUNCTION "public"."audit"()`,
		`ALTER TRIGGER "a" ON "public"."t" RENAME TO "b"`,
		`DROP TRIGGER "c" ON "public"."t"`,
		`CREATE TRIGGER "c" BEFORE INSERT OR DELETE ON "public"."t" FOR EACH ROW WHEN (NEW.a IS NOT NULL) EXECUTE FUNCTION "public"."audit"()`,
		`DROP TRIGGER "d" ON "public"."t"`,
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %q", got)
	}
}
