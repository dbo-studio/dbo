package processors

import (
	"reflect"
	"testing"
)

func TestApplyImportMapping(t *testing.T) {
	rows := [][]string{{"1", "a", "x"}, {"2", "b", "y"}}
	cols := []string{"id", "name", "junk"}

	got, gotCols, err := ApplyImportMapping(rows, cols, map[string]string{"id": "user_id", "name": "full_name"})
	if err != nil {
		t.Fatal(err)
	}

	if !reflect.DeepEqual(gotCols, []string{"user_id", "full_name"}) || !reflect.DeepEqual(got, [][]string{{"1", "a"}, {"2", "b"}}) {
		t.Fatalf("got %v %v", gotCols, got)
	}

	if _, _, err := ApplyImportMapping(rows, cols, map[string]string{"id": "a", "name": "a"}); err == nil {
		t.Fatal("duplicate target must fail")
	}

	if _, _, err := ApplyImportMapping(rows, cols, map[string]string{}); err == nil {
		t.Fatal("empty mapping must fail")
	}

	same, sameCols, _ := ApplyImportMapping(rows, cols, nil)
	if len(same) != 2 || len(sameCols) != 3 {
		t.Fatal("nil mapping must keep the file")
	}
}

func TestParseImportFileDelimiter(t *testing.T) {
	rows, cols, err := ParseImportFile("csv", ";", []byte("a;b\n1;2\n"))
	if err != nil || len(cols) != 2 || rows[0][1] != "2" {
		t.Fatalf("got %v %v %v", rows, cols, err)
	}
}
