package dto

import (
	"strings"
	"testing"
)

func TestSchemaChangeColumnDefault(t *testing.T) {
	ok := []string{"0", "-1.5", "'abc'", "NULL", "true", "CURRENT_TIMESTAMP", "now()"}
	bad := []string{"1; DROP TABLE x", "1 -- c", "(SELECT 1)", "pg_sleep(10)", "'a' || 'b'"}

	for _, d := range ok {
		d := d
		if err := (SchemaChangeColumn{Name: "c", Type: "int", Default: &d}).Validate(); err != nil {
			t.Errorf("default %q should pass: %v", d, err)
		}
	}

	for _, d := range bad {
		d := d
		if err := (SchemaChangeColumn{Name: "c", Type: "int", Default: &d}).Validate(); err == nil {
			t.Errorf("default %q should fail", d)
		}
	}
}

func TestSchemaChangeIdentifiers(t *testing.T) {
	op := SchemaChangeOp{Op: SchemaChangeAddForeignKey, Table: `a"; drop`, RefTable: "b", FkColumns: []string{"x"}, RefColumns: []string{"y"}}
	if err := op.Validate(); err == nil {
		t.Error("bad table name should fail")
	}
}

func TestForeignKeyNameCapped(t *testing.T) {
	op := SchemaChangeOp{Table: strings.Repeat("t", 60), FkColumns: []string{"a"}, RefTable: "r1"}
	other := op
	other.RefTable = "r2"

	if n := op.ForeignKeyName(); len(n) > 63 {
		t.Errorf("name too long: %d", len(n))
	}

	if op.ForeignKeyName() == other.ForeignKeyName() {
		t.Error("different ref tables must give different names")
	}
}
