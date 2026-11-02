package databaseContract

import "context"

// TableStructureRepository reads the live definition of one table, so a
// proposed change can be shown against what exists.
type TableStructureRepository interface {
	TableStructure(ctx context.Context, table string, database, schema *string) (*TableStructure, error)
}

type TableStructure struct {
	Columns     []StructureColumn     `json:"columns"`
	Indexes     []StructureIndex      `json:"indexes"`
	ForeignKeys []StructureForeignKey `json:"foreignKeys"`
}

type StructureColumn struct {
	Name         string `json:"name"`
	DataType     string `json:"dataType"`
	NotNull      bool   `json:"notNull"`
	Default      string `json:"default,omitempty"`
	IsPrimaryKey bool   `json:"isPrimaryKey"`
}

type StructureIndex struct {
	Name    string   `json:"name"`
	Columns []string `json:"columns"`
	Unique  bool     `json:"unique"`
}

type StructureForeignKey struct {
	Name       string   `json:"name"`
	Columns    []string `json:"columns"`
	RefTable   string   `json:"refTable"`
	RefColumns []string `json:"refColumns"`
	OnDelete   string   `json:"onDelete,omitempty"`
}
