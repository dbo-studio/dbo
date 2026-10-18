package ddlMysql

import (
	"reflect"
	"testing"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

func TestRoutineStatements(t *testing.T) {
	fn := &dto.RoutineData{
		Name: lo.ToPtr("f"), Parameters: lo.ToPtr("a INT"), Returns: lo.ToPtr("INT"),
		Deterministic: lo.ToPtr(true), Comment: lo.ToPtr("c"), Body: lo.ToPtr("RETURN a + 1"),
	}

	var got []string
	for _, s := range BuildRoutineEdit(RoutineInput{Database: "db", Old: &dto.RoutineData{Name: lo.ToPtr("f")}, New: fn}) {
		got = append(got, s.SQL)
	}

	want := []string{
		"DROP FUNCTION `db`.`f`",
		"CREATE FUNCTION `db`.`f`(a INT) RETURNS INT DETERMINISTIC COMMENT 'c' RETURN a + 1",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %q", got)
	}

	if BuildRoutineCreate(RoutineInput{Database: "db", Procedure: true, New: &dto.RoutineData{Name: lo.ToPtr("p")}}) != nil {
		t.Fatal("empty body must be rejected")
	}
}
