package databaseCore

import (
	"testing"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func TestBuildGeneralFormResponse(t *testing.T) {
	t.Parallel()

	fields := []contract.FormField{
		{ID: "datname", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
	}

	response, err := (*BaseRepository)(nil).BuildGeneralFormResponse(fields, map[string]any{
		"datname": "app_db",
	})
	if err != nil {
		t.Fatalf("BuildGeneralFormResponse: %v", err)
	}

	if len(response.General) != 1 {
		t.Fatalf("expected 1 general field, got %d", len(response.General))
	}
	if response.General[0].Value != "app_db" {
		t.Fatalf("expected datname app_db, got %v", response.General[0].Value)
	}
	if len(response.Schema) != 0 {
		t.Fatalf("expected empty schema, got %d fields", len(response.Schema))
	}
	if len(response.Data) != 0 {
		t.Fatalf("expected empty data, got %d rows", len(response.Data))
	}
}

func TestBuildArrayFormResponse(t *testing.T) {
	t.Parallel()

	fields := []contract.FormField{
		{ID: "column_name", Name: "Name", Type: contract.FormFieldTypeText},
		{ID: "data_type", Name: "Type", Type: contract.FormFieldTypeText},
	}

	response, err := (*BaseRepository)(nil).BuildArrayFormResponse([]map[string]any{
		{"column_name": "id", "data_type": "integer"},
	}, fields)
	if err != nil {
		t.Fatalf("BuildArrayFormResponse: %v", err)
	}

	if len(response.General) != 0 {
		t.Fatalf("expected empty general, got %d fields", len(response.General))
	}
	if len(response.Schema) != 2 {
		t.Fatalf("expected 2 schema fields, got %d", len(response.Schema))
	}
	if len(response.Data) != 1 {
		t.Fatalf("expected 1 data row, got %d", len(response.Data))
	}
}

func TestBuildHybridFormResponse(t *testing.T) {
	t.Parallel()

	general := []contract.GeneralField{
		{ID: "relname", Name: "Name", Type: contract.FormFieldTypeText, Value: "users"},
	}
	fields := []contract.FormField{
		{ID: "column_name", Name: "Name", Type: contract.FormFieldTypeText},
	}

	response, err := (*BaseRepository)(nil).BuildHybridFormResponse(general, []map[string]any{
		{"column_name": "id"},
	}, fields)
	if err != nil {
		t.Fatalf("BuildHybridFormResponse: %v", err)
	}

	if len(response.General) != 1 {
		t.Fatalf("expected 1 general field, got %d", len(response.General))
	}
	if len(response.Data) != 1 {
		t.Fatalf("expected 1 data row, got %d", len(response.Data))
	}
}
