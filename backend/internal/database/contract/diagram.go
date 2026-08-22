package databaseContract

import "context"

type DiagramKind string

const (
	DiagramKindTable DiagramKind = "table"
)

type DiagramRepository interface {
	Diagram(ctx context.Context, opts DiagramOptions) (*DiagramGraph, error)
}

type DiagramOptions struct {
	Database *string
	Schema   *string
	// Tables is an optional seed list. Drivers expand it by one FK hop
	// (referencing and referenced tables) before loading columns.
	Tables []string
}

// DiagramGraph is the stable schema model reused by the ERD canvas and, later,
// Agent diagram_diff ops. Node IDs match tree node IDs.
type DiagramGraph struct {
	Nodes []DiagramNode `json:"nodes"`
	Edges []DiagramEdge `json:"edges"`
}

type DiagramNode struct {
	ID       string          `json:"id"`
	Kind     DiagramKind     `json:"kind"`
	Name     string          `json:"name"`
	Schema   string          `json:"schema,omitempty"`
	Database string          `json:"database,omitempty"`
	Columns  []DiagramColumn `json:"columns"`
}

type DiagramColumn struct {
	Name         string `json:"name"`
	DataType     string `json:"dataType"`
	IsPrimaryKey bool   `json:"isPrimaryKey"`
	IsForeignKey bool   `json:"isForeignKey"`
}

type DiagramEdge struct {
	ID            string   `json:"id"`
	Source        string   `json:"source"`
	Target        string   `json:"target"`
	SourceColumns []string `json:"sourceColumns"`
	TargetColumns []string `json:"targetColumns"`
	OnUpdate      string   `json:"onUpdate,omitempty"`
	OnDelete      string   `json:"onDelete,omitempty"`
}

// OrEmptyColumns returns cols, or an empty non-nil slice when cols is nil.
func OrEmptyColumns(cols []DiagramColumn) []DiagramColumn {
	if cols == nil {
		return []DiagramColumn{}
	}

	return cols
}

// DiagramEdgeID builds a stable unique edge id for React Flow.
func DiagramEdgeID(constraintName, sourceID, targetID string) string {
	return constraintName + ":" + sourceID + "->" + targetID
}
