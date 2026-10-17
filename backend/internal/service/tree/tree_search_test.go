package serviceTree

import (
	"context"
	"errors"
	"slices"
	"testing"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func folder(id, name string) contract.TreeNode {
	return contract.TreeNode{ID: id, Name: name, HasChildren: true, Children: []contract.TreeNode{}}
}

func leaf(id, name string) contract.TreeNode {
	return contract.TreeNode{ID: id, Name: name, Children: []contract.TreeNode{}}
}

// Mirrors the Postgres shape: root lists databases; every deeper level is fetched lazily by id.
func fakeServer(fetched *[]string) treeLevelFetcher {
	levels := map[string]contract.TreeNode{
		"":                          {ID: "1@database", Name: "conn", HasChildren: true, Children: []contract.TreeNode{folder("app", "app"), folder("broken", "broken")}},
		"app":                       {ID: "app", Children: []contract.TreeNode{folder("app.public", "public")}},
		"app.public":                {ID: "app.public", Children: []contract.TreeNode{folder("app.public.tableContainer", "Tables")}},
		"app.public.tableContainer": {ID: "app.public.tableContainer", Children: []contract.TreeNode{leaf("users", "users"), leaf("user_roles", "user_roles"), leaf("orders", "orders")}},
	}

	return func(_ context.Context, parentID string) (*contract.TreeNode, error) {
		*fetched = append(*fetched, parentID)
		if parentID == "broken" {
			return nil, errors.New("permission denied")
		}
		level, ok := levels[parentID]
		if !ok {
			return nil, errors.New("unknown level")
		}
		return &level, nil
	}
}

func names(results []TreeSearchResult) []string {
	out := []string{}
	for _, r := range results {
		out = append(out, r.Node.Name)
	}
	return out
}

func TestSearchTreeFindsItemsInUnopenedFolders(t *testing.T) {
	var fetched []string
	res, err := searchTree(context.Background(), fakeServer(&fetched), "USER", 50, 100)
	if err != nil {
		t.Fatal(err)
	}
	if got := names(res.Results); !slices.Equal(got, []string{"users", "user_roles"}) {
		t.Fatalf("results = %v", got)
	}
	if res.Truncated {
		t.Fatal("unexpected truncation")
	}

	path := []string{}
	for _, p := range res.Results[0].Path {
		path = append(path, p.ID)
	}
	if !slices.Equal(path, []string{"1@database", "app", "app.public", "app.public.tableContainer"}) {
		t.Fatalf("path = %v", path)
	}
	if len(res.Results[0].Path[1].Children) != 0 {
		t.Fatal("path nodes must be shallow")
	}
}

func TestSearchTreeSkipsUnreadableLevels(t *testing.T) {
	var fetched []string
	res, err := searchTree(context.Background(), fakeServer(&fetched), "orders", 50, 100)
	if err != nil {
		t.Fatal(err)
	}
	if got := names(res.Results); !slices.Equal(got, []string{"orders"}) {
		t.Fatalf("results = %v", got)
	}
	if !slices.Contains(fetched, "broken") {
		t.Fatal("expected the broken level to be attempted")
	}
}

func TestSearchTreeStopsAtLimitAndBudget(t *testing.T) {
	var fetched []string
	res, err := searchTree(context.Background(), fakeServer(&fetched), "user", 1, 100)
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Results) != 1 || !res.Truncated {
		t.Fatalf("limit: results=%d truncated=%v", len(res.Results), res.Truncated)
	}

	fetched = nil
	res, err = searchTree(context.Background(), fakeServer(&fetched), "orders", 50, 2)
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Results) != 0 || !res.Truncated || len(fetched) > 2 {
		t.Fatalf("budget: results=%d truncated=%v fetched=%v", len(res.Results), res.Truncated, fetched)
	}
}
