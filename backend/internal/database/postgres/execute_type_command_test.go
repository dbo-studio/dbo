package databasePostgres

import (
	"reflect"
	"testing"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
)

func TestEnumQueries(t *testing.T) {
	create, err := createEnumQueries("public", &dto.PostgresTypeData{Name: lo.ToPtr("mood"), Values: lo.ToPtr("sad, ok , it's fine"), Comment: lo.ToPtr("c")})
	if err != nil {
		t.Fatal(err)
	}

	wantCreate := []string{
		`CREATE TYPE "public"."mood" AS ENUM ('sad', 'ok', 'it''s fine')`,
		`COMMENT ON TYPE "public"."mood" IS 'c'`,
	}
	if !reflect.DeepEqual(create, wantCreate) {
		t.Fatalf("got %q", create)
	}

	node := contract.DBNode{Schema: "public", Table: "mood"}

	edit, err := editEnumQueries(node, &dto.PostgresTypeParams{
		Old: &dto.PostgresTypeData{Name: lo.ToPtr("mood"), Values: lo.ToPtr("sad, ok")},
		New: &dto.PostgresTypeData{Name: lo.ToPtr("feeling"), Values: lo.ToPtr("sad, ok, happy")},
	})
	if err != nil {
		t.Fatal(err)
	}

	wantEdit := []string{
		`ALTER TYPE "public"."mood" RENAME TO "feeling"`,
		`ALTER TYPE "public"."feeling" ADD VALUE 'happy'`,
	}
	if !reflect.DeepEqual(edit, wantEdit) {
		t.Fatalf("got %q", edit)
	}

	_, err = editEnumQueries(node, &dto.PostgresTypeParams{
		Old: &dto.PostgresTypeData{Name: lo.ToPtr("mood"), Values: lo.ToPtr("sad, ok")},
		New: &dto.PostgresTypeData{Name: lo.ToPtr("mood"), Values: lo.ToPtr("ok")},
	})
	if err == nil {
		t.Fatal("expected error when removing a value")
	}
}
