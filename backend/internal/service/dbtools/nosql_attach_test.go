package serviceDbtools

import (
	"context"
	"strings"
	"testing"

	databaseNoSQLFixture "github.com/dbo-studio/dbo/internal/database/nosqlfixture"
)

func TestContainerNamesListsEveryContainer(t *testing.T) {
	names, err := ContainerNames(context.Background(), databaseNoSQLFixture.New(), MaxPickerContainers)
	if err != nil {
		t.Fatal(err)
	}

	if len(names) != 7 {
		t.Fatalf("got %d containers: %v", len(names), names)
	}

	limited, _ := ContainerNames(context.Background(), databaseNoSQLFixture.New(), 3)
	if len(limited) != 3 {
		t.Fatalf("limit ignored: %v", limited)
	}
}

func TestDescribeAttachedOnlyDescribesListedContainers(t *testing.T) {
	repo := databaseNoSQLFixture.New()

	out := DescribeAttached(context.Background(), repo, []string{"documents", "not-a-container"})
	if !strings.Contains(out, "The user attached documents") || !strings.Contains(out, `"name"`) {
		t.Fatalf("attached container is not described: %q", out)
	}

	if strings.Contains(out, "not-a-container") {
		t.Fatalf("a name the driver does not list must be skipped: %q", out)
	}

	if DescribeAttached(context.Background(), repo, nil) != "" {
		t.Fatal("nothing attached must add nothing")
	}
}
