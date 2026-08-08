package sqlguard

import (
	"strings"
	"testing"
)

func TestResolveLimitPage(t *testing.T) {
	t.Parallel()

	limit := 500
	page := 3
	over := 50000
	zero := 0

	tests := []struct {
		name      string
		limit     *int
		page      *int
		wantLimit int
		wantPage  int
	}{
		{name: "defaults", wantLimit: DefaultQueryLimit, wantPage: 1},
		{name: "custom", limit: &limit, page: &page, wantLimit: 500, wantPage: 3},
		{name: "clamp_max", limit: &over, wantLimit: MaxQueryLimit, wantPage: 1},
		{name: "ignore_zero", limit: &zero, page: &zero, wantLimit: DefaultQueryLimit, wantPage: 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			gotLimit, gotPage := ResolveLimitPage(tt.limit, tt.page)
			if gotLimit != tt.wantLimit || gotPage != tt.wantPage {
				t.Fatalf("ResolveLimitPage() = (%d,%d), want (%d,%d)", gotLimit, gotPage, tt.wantLimit, tt.wantPage)
			}
		})
	}
}

func TestApplyLimitOffset(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name          string
		sql           string
		limit         int
		page          int
		wantPaginated bool
		wantContains  []string
		wantUnchanged bool
	}{
		{
			name:          "inject_select",
			sql:           "SELECT id FROM users",
			limit:         100,
			page:          1,
			wantPaginated: true,
			wantContains:  []string{"LIMIT 100 OFFSET 0"},
		},
		{
			name:          "inject_page_2",
			sql:           "SELECT id FROM users",
			limit:         50,
			page:          2,
			wantPaginated: true,
			wantContains:  []string{"LIMIT 50 OFFSET 50"},
		},
		{
			name:          "existing_limit_ast",
			sql:           "SELECT id FROM users LIMIT 5",
			limit:         100,
			page:          1,
			wantPaginated: false,
			wantUnchanged: true,
		},
		{
			name:          "existing_limit_text",
			sql:           "select id from users limit 5",
			limit:         100,
			page:          1,
			wantPaginated: false,
			wantUnchanged: true,
		},
		{
			name:          "insert",
			sql:           "INSERT INTO users (name) VALUES ('a')",
			limit:         100,
			page:          1,
			wantPaginated: false,
			wantUnchanged: true,
		},
		{
			name:          "multi_statement",
			sql:           "SELECT 1; SELECT 2",
			limit:         100,
			page:          1,
			wantPaginated: false,
			wantUnchanged: true,
		},
		{
			name:          "with_select_no_rewrite",
			sql:           "WITH cte AS (SELECT 1 AS n) SELECT n FROM cte",
			limit:         10,
			page:          1,
			wantPaginated: false,
			wantUnchanged: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := ApplyLimitOffset(tt.sql, tt.limit, tt.page)
			if got.Paginated != tt.wantPaginated {
				t.Fatalf("Paginated = %v, want %v (query=%q)", got.Paginated, tt.wantPaginated, got.Query)
			}

			if tt.wantUnchanged && got.Query != tt.sql {
				t.Fatalf("query changed: got %q want %q", got.Query, tt.sql)
			}

			lower := strings.ToLower(got.Query)
			for _, part := range tt.wantContains {
				if !strings.Contains(lower, strings.ToLower(part)) {
					t.Fatalf("query %q missing %q", got.Query, part)
				}
			}
		})
	}
}
