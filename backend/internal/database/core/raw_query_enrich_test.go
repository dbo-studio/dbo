package databaseCore

import (
	"context"
	"errors"
	"testing"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

type rawQueryResolverStub struct {
	isTableErr     error
	loadColumnsErr error
}

func (s rawQueryResolverStub) IsBaseTable(_ context.Context, _, _ *string, _ string) (bool, error) {
	if s.isTableErr != nil {
		return false, s.isTableErr
	}
	return true, nil
}

func (s rawQueryResolverStub) LoadTableColumns(_ context.Context, _, _ *string, _ string) ([]dto.Column, error) {
	if s.loadColumnsErr != nil {
		return nil, s.loadColumnsErr
	}

	return []dto.Column{
		{Name: "id", IsPrimaryKey: true, MappedType: "number"},
		{Name: "name", MappedType: "string"},
	}, nil
}

func (s rawQueryResolverStub) BuildNodeID(_, _, table string) string {
	return table
}

func TestEnrichRawQueryResponse_MetadataErrorDoesNotFailQuery(t *testing.T) {
	t.Parallel()

	resp := &dto.RawQueryResponse{
		Query: "SELECT * FROM users",
		Data: []map[string]any{
			{"id": 1, "name": "alice"},
		},
		Columns: []dto.Column{
			{Name: "id", Type: "int", MappedType: "number", IsActive: true},
			{Name: "name", Type: "text", MappedType: "string", IsActive: true},
		},
	}

	enriched, err := EnrichRawQueryResponse(
		context.Background(),
		&dto.RawQueryRequest{Query: resp.Query},
		resp,
		rawQueryResolverStub{loadColumnsErr: errors.New("metadata unavailable")},
	)
	if err != nil {
		t.Fatalf("expected enrichment to be best-effort, got error: %v", err)
	}
	if enriched.Editable {
		t.Fatal("expected read-only response when metadata lookup fails")
	}
	if enriched.EditableReason == nil || *enriched.EditableReason == "" {
		t.Fatal("expected editable reason when metadata lookup fails")
	}
	if len(enriched.Data) != 1 {
		t.Fatalf("expected query data to be preserved, got %+v", enriched.Data)
	}
}

func TestEnrichRawQueryResponse_SkipsCommandResponse(t *testing.T) {
	t.Parallel()

	resp := &dto.RawQueryResponse{
		Query: "INSERT INTO users (name) VALUES ('alice')",
		Data: []map[string]any{
			{"Query": "INSERT INTO users (name) VALUES ('alice')", "Message": "OK", "Duration": "0.01"},
		},
		Columns: []dto.Column{
			{Name: "Query", IsActive: true},
			{Name: "Message", IsActive: true},
			{Name: "Duration", IsActive: true},
		},
	}

	enriched, err := EnrichRawQueryResponse(
		context.Background(),
		&dto.RawQueryRequest{Query: resp.Query},
		resp,
		rawQueryResolverStub{isTableErr: errors.New("should not be called")},
	)
	if err != nil {
		t.Fatalf("expected command response to skip enrichment, got error: %v", err)
	}
	if enriched.Editable {
		t.Fatal("expected command response to remain non-editable")
	}
}
