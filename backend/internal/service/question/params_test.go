package serviceQuestion

import "testing"

func TestRenderParams(t *testing.T) {
	cases := []struct {
		name, sql, want string
		values          map[string]string
		mysql, fails    bool
	}{
		{name: "no params", sql: "SELECT 1", want: "SELECT 1"},
		{name: "number", sql: "SELECT * FROM t WHERE n > {{min}}", values: map[string]string{"min": "-2.5"}, want: "SELECT * FROM t WHERE n > -2.5"},
		{name: "text quoted", sql: "WHERE r = {{ region }}", values: map[string]string{"region": "east"}, want: "WHERE r = 'east'"},
		{name: "quote doubled", sql: "WHERE r = {{r}}", values: map[string]string{"r": "x' OR '1'='1"}, want: "WHERE r = 'x'' OR ''1''=''1'"},
		{name: "backslash kept outside mysql", sql: "{{r}}", values: map[string]string{"r": `a\'`}, want: `'a\'''`},
		{name: "backslash escaped in mysql", sql: "{{r}}", values: map[string]string{"r": `a\'`}, mysql: true, want: `'a\\'''`},
		{name: "not a number", sql: "{{r}}", values: map[string]string{"r": "1; DROP TABLE t"}, want: "'1; DROP TABLE t'"},
		{name: "repeated", sql: "{{a}} + {{a}}", values: map[string]string{"a": "1"}, want: "1 + 1"},
		{name: "missing", sql: "{{a}} {{b}} {{a}}", values: map[string]string{"b": "1"}, fails: true},
		{name: "nul", sql: "{{a}}", values: map[string]string{"a": "x\x00"}, fails: true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := RenderParams(tc.sql, tc.values, tc.mysql)
			if tc.fails {
				if err == nil {
					t.Fatalf("expected an error, got %q", got)
				}
				return
			}
			if err != nil || got != tc.want {
				t.Fatalf("got %q, %v; want %q", got, err, tc.want)
			}
		})
	}
}
