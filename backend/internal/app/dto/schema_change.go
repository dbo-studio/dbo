package dto

import (
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/invopop/validation"
)

// Schema change ops are proposed by the AI agent (propose_schema_change) and
// only reach the database through the preview/apply endpoints after the user
// accepts them.
const (
	SchemaChangeCreateTable   = "create_table"
	SchemaChangeAddColumn     = "add_column"
	SchemaChangeAddForeignKey = "add_foreign_key"
)

var (
	schemaChangeTypePattern     = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_ ]*(\(\s*\d+\s*(,\s*\d+\s*)?\))?(\[\])?$`)
	schemaChangeOnDeleteOptions = []any{"", "NO ACTION", "CASCADE", "SET NULL", "RESTRICT"}
)

type (
	SchemaChangeColumn struct {
		Name    string  `json:"name"`
		Type    string  `json:"type"`
		NotNull bool    `json:"notNull"`
		Primary bool    `json:"primary"`
		Default *string `json:"default"`
	}

	SchemaChangeOp struct {
		Op         string               `json:"op"`
		Table      string               `json:"table"`
		Columns    []SchemaChangeColumn `json:"columns,omitempty"`
		Column     *SchemaChangeColumn  `json:"column,omitempty"`
		FkColumns  []string             `json:"fkColumns,omitempty"`
		RefTable   string               `json:"refTable,omitempty"`
		RefColumns []string             `json:"refColumns,omitempty"`
		OnDelete   string               `json:"onDelete,omitempty"`
	}

	SchemaChangeRequest struct {
		ConnectionID int32            `json:"connectionId"`
		Database     *string          `json:"database"`
		Schema       *string          `json:"schema"`
		Ops          []SchemaChangeOp `json:"ops"`
		Confirmed    bool             `json:"confirmed"`
	}

	SchemaChangePreviewResponse struct {
		Queries []string `json:"queries"`
	}
)

func (req SchemaChangeRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Ops, validation.Required, validation.Length(1, 50)),
	)
}

func (c SchemaChangeColumn) Validate() error {
	return validation.ValidateStruct(&c,
		validation.Field(&c.Name, validation.Required, validation.Length(1, 128)),
		validation.Field(&c.Type, validation.Required, validation.Length(1, 64), validation.Match(schemaChangeTypePattern)),
		validation.Field(&c.Default, validation.By(func(value any) error {
			def, _ := value.(*string)
			if def != nil && strings.ContainsAny(*def, ";") {
				return errors.New("must be a single expression")
			}

			return nil
		})),
	)
}

func (op SchemaChangeOp) Validate() error {
	err := validation.ValidateStruct(&op,
		validation.Field(&op.Op, validation.Required, validation.In(SchemaChangeCreateTable, SchemaChangeAddColumn, SchemaChangeAddForeignKey)),
		validation.Field(&op.Table, validation.Required, validation.Length(1, 128)),
		validation.Field(&op.OnDelete, validation.In(schemaChangeOnDeleteOptions...)),
	)
	if err != nil {
		return err
	}

	switch op.Op {
	case SchemaChangeCreateTable:
		if len(op.Columns) == 0 {
			return fmt.Errorf("%s %q: columns are required", op.Op, op.Table)
		}

		for _, col := range op.Columns {
			if err := col.Validate(); err != nil {
				return fmt.Errorf("%s %q: %w", op.Op, op.Table, err)
			}
		}
	case SchemaChangeAddColumn:
		if op.Column == nil {
			return fmt.Errorf("%s %q: column is required", op.Op, op.Table)
		}

		if err := op.Column.Validate(); err != nil {
			return fmt.Errorf("%s %q: %w", op.Op, op.Table, err)
		}
	case SchemaChangeAddForeignKey:
		if op.RefTable == "" || len(op.FkColumns) == 0 || len(op.FkColumns) != len(op.RefColumns) {
			return fmt.Errorf("%s %q: fkColumns, refTable and matching refColumns are required", op.Op, op.Table)
		}
	}

	return nil
}

// ForeignKeyName is the deterministic constraint name used for agent-proposed
// foreign keys, so the diagram edge id and the applied constraint agree.
func (op SchemaChangeOp) ForeignKeyName() string {
	return fmt.Sprintf("fk_%s_%s", op.Table, strings.Join(op.FkColumns, "_"))
}
