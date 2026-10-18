package ddlMysql

import (
	"reflect"
	"testing"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
)

func TestTriggerStatements(t *testing.T) {
	trigger := func(name, body string) *dto.MysqlTableTriggerData {
		return &dto.MysqlTableTriggerData{Name: lo.ToPtr(name), Timing: lo.ToPtr("after"), Event: lo.ToPtr("insert"), Body: lo.ToPtr(body)}
	}

	var got []string
	for _, s := range triggerStatements("db", "t", []dto.MysqlTableTrigger{
		{New: trigger("a", "SET @x = 1"), Added: lo.ToPtr(true)},
		{Old: trigger("b", "SET @x = 1"), New: trigger("b", "SET @x = 2")},
		{Old: trigger("c", "SET @x = 1"), New: trigger("c", "SET @x = 1")},
		{Old: trigger("d", "SET @x = 1"), New: trigger("d", "SET @x = 1"), Deleted: lo.ToPtr(true)},
	}, contract.EditTableAction) {
		got = append(got, s.SQL)
	}

	want := []string{
		"CREATE TRIGGER `db`.`a` AFTER INSERT ON `db`.`t` FOR EACH ROW SET @x = 1",
		"DROP TRIGGER `db`.`b`",
		"CREATE TRIGGER `db`.`b` AFTER INSERT ON `db`.`t` FOR EACH ROW SET @x = 2",
		"DROP TRIGGER `db`.`d`",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %q", got)
	}
}
