package ddlPostgres

import (
	"reflect"
	"testing"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
)

func TestIndexStatements(t *testing.T) {
	data := func(name string, unique bool, method string, where string, cols ...string) *dto.PostgresTableIndexData {
		return &dto.PostgresTableIndexData{
			Name: lo.ToPtr(name), Unique: lo.ToPtr(unique), Method: lo.ToPtr(method),
			Where: lo.ToPtr(where), Columns: cols,
		}
	}

	tests := []struct {
		name   string
		action contract.TreeNodeActionName
		rows   []dto.PostgresTableIndex
		want   []string
	}{
		{
			name:   "add unique partial gin",
			action: contract.EditTableAction,
			rows:   []dto.PostgresTableIndex{{New: data("ix_email", true, "btree", "deleted_at IS NULL", "email"), Added: lo.ToPtr(true)}},
			want:   []string{`CREATE UNIQUE INDEX "ix_email" ON "public"."users" USING btree ("email") WHERE deleted_at IS NULL`},
		},
		{
			name:   "delete",
			action: contract.EditTableAction,
			rows:   []dto.PostgresTableIndex{{Old: data("ix_a", false, "btree", "", "a"), New: data("ix_a", false, "btree", "", "a"), Deleted: lo.ToPtr(true)}},
			want:   []string{`DROP INDEX "public"."ix_a"`},
		},
		{
			name:   "column change recreates",
			action: contract.EditTableAction,
			rows:   []dto.PostgresTableIndex{{Old: data("ix_a", false, "btree", "", "a"), New: data("ix_a", false, "btree", "", "a", "b")}},
			want: []string{
				`DROP INDEX "public"."ix_a"`,
				`CREATE INDEX "ix_a" ON "public"."users" USING btree ("a", "b")`,
			},
		},
		{
			name:   "rename in place",
			action: contract.EditTableAction,
			rows:   []dto.PostgresTableIndex{{Old: data("ix_a", false, "btree", "", "a"), New: data("ix_b", false, "btree", "", "a")}},
			want:   []string{`ALTER INDEX "public"."ix_a" RENAME TO "ix_b"`},
		},
		{
			name:   "invalid method falls back to btree",
			action: contract.CreateTableAction,
			rows:   []dto.PostgresTableIndex{{New: data("ix_a", false, "x; DROP", "", "a")}},
			want:   []string{`CREATE INDEX "ix_a" ON "public"."users" USING btree ("a")`},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got []string
			for _, s := range indexStatements("public", "users", tt.rows, tt.action) {
				got = append(got, s.SQL)
			}

			if !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("got %q, want %q", got, tt.want)
			}
		})
	}
}
