package dto

import "github.com/invopop/validation"

type (
	SchemaDiagramRequest struct {
		ConnectionId int32   `json:"connectionId"`
		Schema       *string `json:"schema"`
	}

	SchemaDiagramResponse struct {
		Database      string                `json:"database"` // Current database name
		Tables        []DiagramTable        `json:"tables"`
		Relationships []DiagramRelationship `json:"relationships"`
		Layout        *DiagramLayout        `json:"layout,omitempty"`
	}

	DiagramTable struct {
		ID          string          `json:"id"`       // "schema.table"
		Database    string          `json:"database"` // Database name (for building nodeId)
		Schema      string          `json:"schema"`
		Name        string          `json:"name"`
		Columns     []DiagramColumn `json:"columns"`
		PrimaryKeys []string        `json:"primaryKeys"`
	}

	DiagramColumn struct {
		Name      string  `json:"name"`
		Type      string  `json:"type"`
		NotNull   bool    `json:"notNull"`
		Default   *string `json:"default,omitempty"`
		Comment   *string `json:"comment,omitempty"`
		IsPrimary bool    `json:"isPrimary"`
		IsForeign bool    `json:"isForeign"`
	}

	DiagramRelationship struct {
		ID             string `json:"id"`
		SourceTable    string `json:"sourceTable"` // "schema.table"
		SourceColumn   string `json:"sourceColumn"`
		TargetTable    string `json:"targetTable"` // "schema.table"
		TargetColumn   string `json:"targetColumn"`
		ConstraintName string `json:"constraintName"`
		OnDelete       string `json:"onDelete,omitempty"`
		OnUpdate       string `json:"onUpdate,omitempty"`
	}

	DiagramLayout struct {
		Nodes []DiagramNodePosition `json:"nodes"`
		Edges []DiagramEdgePosition `json:"edges,omitempty"`
	}

	DiagramNodePosition struct {
		TableID string  `json:"tableId"`
		X       float64 `json:"x"`
		Y       float64 `json:"y"`
	}

	DiagramEdgePosition struct {
		EdgeID string `json:"edgeId"`
		// Edge positions are calculated automatically by React Flow
		// This is just for reference if needed
	}

	SaveLayoutRequest struct {
		ConnectionId int32         `json:"connectionId"`
		Schema       string        `json:"schema"`
		Layout       DiagramLayout `json:"layout"`
	}

	SaveRelationshipRequest struct {
		ConnectionId   int32  `json:"connectionId"`
		SourceTable    string `json:"sourceTable"` // "schema.table"
		SourceColumn   string `json:"sourceColumn"`
		TargetTable    string `json:"targetTable"` // "schema.table"
		TargetColumn   string `json:"targetColumn"`
		ConstraintName string `json:"constraintName"`
		OnDelete       string `json:"onDelete,omitempty"`
		OnUpdate       string `json:"onUpdate,omitempty"`
	}

	DeleteRelationshipRequest struct {
		ConnectionId   int32  `json:"connectionId"`
		ConstraintName string `json:"constraintName"`
		Table          string `json:"table"` // "schema.table"
	}
)

func (req SchemaDiagramRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
	)
}

func (req SaveLayoutRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&req.Schema, validation.Required),
	)
}

func (req SaveRelationshipRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&req.SourceTable, validation.Required),
		validation.Field(&req.SourceColumn, validation.Required),
		validation.Field(&req.TargetTable, validation.Required),
		validation.Field(&req.TargetColumn, validation.Required),
		validation.Field(&req.ConstraintName, validation.Required),
	)
}

func (req DeleteRelationshipRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&req.ConstraintName, validation.Required),
		validation.Field(&req.Table, validation.Required),
	)
}
