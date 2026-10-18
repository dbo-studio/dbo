package ddlPostgres

import (
	"reflect"
	"testing"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
)

func TestSequenceStatements(t *testing.T) {
	create := sqls(BuildSequenceStatements(SequenceInput{Schema: "public", New: &dto.PostgresSequenceData{
		Name: lo.ToPtr("s"), Start: lo.ToPtr("10"), Increment: lo.ToPtr("2"), MaxValue: lo.ToPtr("1; DROP"), Cycle: lo.ToPtr(true), OwnedBy: lo.ToPtr("t.id"),
	}}, contract.CreateSequenceAction))

	wantCreate := []string{
		`CREATE SEQUENCE "public"."s" INCREMENT BY 2 START WITH 10 CYCLE`,
		`ALTER SEQUENCE "public"."s" OWNED BY "public"."t"."id"`,
	}
	if !reflect.DeepEqual(create, wantCreate) {
		t.Fatalf("got %q", create)
	}

	edit := sqls(BuildSequenceStatements(SequenceInput{Schema: "public",
		Old: &dto.PostgresSequenceData{Name: lo.ToPtr("s"), Increment: lo.ToPtr("1"), OwnedBy: lo.ToPtr("t.id")},
		New: &dto.PostgresSequenceData{Name: lo.ToPtr("s2"), Increment: lo.ToPtr("5")},
	}, contract.EditSequenceAction))

	wantEdit := []string{
		`ALTER SEQUENCE "public"."s" INCREMENT BY 5`,
		`ALTER SEQUENCE "public"."s" OWNED BY NONE`,
		`ALTER SEQUENCE "public"."s" RENAME TO "s2"`,
	}
	if !reflect.DeepEqual(edit, wantEdit) {
		t.Fatalf("got %q", edit)
	}

	tab := sqls(tableSequenceStatements("public", "t", []dto.PostgresTableSequence{
		{New: &dto.PostgresSequenceData{Name: lo.ToPtr("s"), OwnedBy: lo.ToPtr("id")}, Added: lo.ToPtr(true)},
		{Old: &dto.PostgresSequenceData{Name: lo.ToPtr("x")}, Deleted: lo.ToPtr(true)},
	}, contract.EditTableAction))

	wantTab := []string{
		`CREATE SEQUENCE "public"."s"`,
		`ALTER SEQUENCE "public"."s" OWNED BY "public"."t"."id"`,
		`DROP SEQUENCE "public"."x"`,
	}
	if !reflect.DeepEqual(tab, wantTab) {
		t.Fatalf("got %q", tab)
	}
}
