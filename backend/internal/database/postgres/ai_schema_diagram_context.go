package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

// AiSchemaDiagramContext converts schema diagram structure to AI-readable format
// This provides a node-based representation that AI can understand and manipulate
func (r *PostgresRepository) AiSchemaDiagramContext(req *dto.AiChatRequest) (string, error) {
	schema := lo.FromPtr(req.ContextOpts.Schema)
	if schema == "" {
		schema = "public"
	}

	// Get schema diagram data
	diagramReq := &dto.SchemaDiagramRequest{
		ConnectionId: req.ConnectionId,
		Schema:       &schema,
	}

	diagram, err := r.SchemaDiagram(diagramReq)
	if err != nil {
		return "", err
	}

	var sb strings.Builder

	sb.WriteString("Database Schema Diagram (Node-based structure):\n")
	sb.WriteString(fmt.Sprintf("Schema: %s\n\n", schema))

	// Tables as nodes
	sb.WriteString("Nodes (Tables):\n")
	for i, table := range diagram.Tables {
		sb.WriteString(fmt.Sprintf("%d. Node ID: %s\n", i+1, table.ID))
		sb.WriteString(fmt.Sprintf("   Table: %s.%s\n", table.Schema, table.Name))
		sb.WriteString("   Columns:\n")
		for _, col := range table.Columns {
			sb.WriteString(fmt.Sprintf("     - %s (%s)", col.Name, col.Type))
			if col.IsPrimary {
				sb.WriteString(" [PK]")
			}
			if col.IsForeign {
				sb.WriteString(" [FK]")
			}
			if col.NotNull {
				sb.WriteString(" [NOT NULL]")
			}
			sb.WriteString("\n")
		}
		if len(table.PrimaryKeys) > 0 {
			sb.WriteString(fmt.Sprintf("   Primary Keys: %s\n", strings.Join(table.PrimaryKeys, ", ")))
		}
		sb.WriteString("\n")
	}

	// Relationships as edges
	if len(diagram.Relationships) > 0 {
		sb.WriteString("Edges (Relationships):\n")
		for i, rel := range diagram.Relationships {
			sb.WriteString(fmt.Sprintf("%d. Edge ID: %s\n", i+1, rel.ID))
			sb.WriteString(fmt.Sprintf("   Source: %s.%s\n", rel.SourceTable, rel.SourceColumn))
			sb.WriteString(fmt.Sprintf("   Target: %s.%s\n", rel.TargetTable, rel.TargetColumn))
			sb.WriteString(fmt.Sprintf("   Constraint: %s\n", rel.ConstraintName))
			if rel.OnDelete != "" {
				sb.WriteString(fmt.Sprintf("   On Delete: %s\n", rel.OnDelete))
			}
			if rel.OnUpdate != "" {
				sb.WriteString(fmt.Sprintf("   On Update: %s\n", rel.OnUpdate))
			}
			sb.WriteString("\n")
		}
	}

	sb.WriteString("\n")
	sb.WriteString("Instructions for AI:\n")
	sb.WriteString("- Use node IDs (e.g., 'schema.table') to reference tables\n")
	sb.WriteString("- Use edge IDs to reference relationships\n")
	sb.WriteString("- When creating new tables, use format 'schema.tablename' as node ID\n")
	sb.WriteString("- When creating relationships, specify source and target node IDs and column names\n")

	return sb.String(), nil
}

