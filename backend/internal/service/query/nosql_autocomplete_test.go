package serviceQuery

import (
	"slices"
	"testing"
)

func TestDatabasesOfMongoContainers(t *testing.T) {
	got := databasesOf([]string{"app/users", "app/orders", "logs/events", "bare"})

	if want := []string{"app", "logs"}; !slices.Equal(got, want) {
		t.Fatalf("got %v, want %v", got, want)
	}
}
