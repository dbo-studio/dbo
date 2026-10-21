package dto

import (
	"crypto/sha1"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/invopop/validation"
)

// Schema change ops are proposed by the AI agent (propose_schema_change) and
// only reach the database through the preview/apply endpoints after the user
// accepts them.
const maxIdentifierLen = 63

const (
	SchemaChangeWrite = "write"
	// SchemaChangeUndo runs compensating SQL the server derived from applied ops.
	// It is only created by the undo endpoint, never accepted from the agent.
	SchemaChangeUndo           = "undo"
	SchemaChangeCreateDatabase = "create_database"
	SchemaChangeCreateSchema   = "create_schema"
	SchemaChangeCreateTable    = "create_table"
	SchemaChangeAddColumn      = "add_column"
	SchemaChangeAlterColumn    = "alter_column"
	SchemaChangeDropColumn     = "drop_column"
	SchemaChangeAddIndex       = "add_index"
	SchemaChangeAddForeignKey  = "add_foreign_key"
	SchemaChangeRenameTable    = "rename_table"
	SchemaChangeRenameColumn   = "rename_column"
	SchemaChangeCreateView     = "create_view"
	SchemaChangeDropView       = "drop_view"
	SchemaChangeAddCheck       = "add_check"
	SchemaChangeDropConstraint = "drop_constraint"
	SchemaChangeDropTable      = "drop_table"
)

// SchemaChangeSQLOps run as one generated statement each instead of through the table form.
var SchemaChangeSQLOps = []string{
	SchemaChangeRenameTable, SchemaChangeRenameColumn, SchemaChangeCreateView, SchemaChangeDropView,
	SchemaChangeAddCheck, SchemaChangeDropConstraint, SchemaChangeDropTable,
}

// SchemaChangeLossyOps lose what was there, so applying them cannot be taken back.
var SchemaChangeLossyOps = []string{
	SchemaChangeAlterColumn, SchemaChangeDropColumn, SchemaChangeDropView, SchemaChangeDropConstraint, SchemaChangeDropTable,
}

var (
	schemaChangeTypePattern     = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_ ]*(\(\s*\d+\s*(,\s*\d+\s*)?\))?(\[\])?$`)
	schemaChangeOnDeleteOptions = []any{"", "NO ACTION", "CASCADE", "SET NULL", "RESTRICT"}
	schemaChangeIdentifier      = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_$]*$`)
	// Literals (number, quoted string without embedded quotes, NULL, booleans)
	// and the bare CURRENT_* / now() keywords. Anything else could smuggle SQL
	// into the generated DDL.
	schemaChangeDefaultPattern = regexp.MustCompile(`(?i)^(-?\d+(\.\d+)?|'[^']*'|null|true|false|current_timestamp|current_date|current_time|now\(\))$`)
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
		Op    string `json:"op"`
		Table string `json:"table,omitempty"`
		// SQL is the INSERT, UPDATE or DELETE of a write; AffectedRows is how many rows it changed when it was previewed.
		SQL          string `json:"sql,omitempty"`
		AffectedRows int64  `json:"affectedRows,omitempty"`
		// Name is the database or schema that create_database or create_schema makes.
		Name    string               `json:"name,omitempty"`
		Columns []SchemaChangeColumn `json:"columns,omitempty"`
		// Column is the new definition for add_column and alter_column (matched by name).
		Column *SchemaChangeColumn `json:"column,omitempty"`
		// ColumnName is the column removed by drop_column.
		ColumnName   string   `json:"columnName,omitempty"`
		IndexColumns []string `json:"indexColumns,omitempty"`
		Unique       bool     `json:"unique,omitempty"`
		FkColumns    []string `json:"fkColumns,omitempty"`
		RefTable     string   `json:"refTable,omitempty"`
		RefColumns   []string `json:"refColumns,omitempty"`
		OnDelete     string   `json:"onDelete,omitempty"`
	}

	SchemaChangeRequest struct {
		ConnectionID int32            `json:"connectionId"`
		Database     *string          `json:"database"`
		Schema       *string          `json:"schema"`
		Ops          []SchemaChangeOp `json:"ops"`
		Confirmed    bool             `json:"confirmed"`
	}

	// DiagramOp mirrors the frontend SchemaOp (core/diagram/types.ts) so a
	// proposed changeset can be overlaid on the diagram with applyOps.
	DiagramOp struct {
		Op     string `json:"op"`
		Target string `json:"target"`
		ID     string `json:"id"`
		NodeID string `json:"nodeId,omitempty"`
		Value  any    `json:"value,omitempty"`
		Patch  any    `json:"patch,omitempty"`
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
		validation.Field(&c.Name, validation.Required, validation.Length(1, 63), validation.Match(schemaChangeIdentifier)),
		validation.Field(&c.Type, validation.Required, validation.Length(1, 64), validation.Match(schemaChangeTypePattern)),
		validation.Field(&c.Default, validation.By(func(value any) error {
			def, _ := value.(*string)
			if def != nil && !schemaChangeDefaultPattern.MatchString(strings.TrimSpace(*def)) {
				return errors.New("must be a literal, NULL, or CURRENT_TIMESTAMP/CURRENT_DATE/CURRENT_TIME/now()")
			}

			return nil
		})),
	)
}

func (op SchemaChangeOp) Validate() error {
	err := validation.ValidateStruct(&op,
		validation.Field(&op.Op, validation.Required, validation.In(SchemaChangeWrite, SchemaChangeUndo, SchemaChangeCreateDatabase, SchemaChangeCreateSchema, SchemaChangeCreateTable, SchemaChangeAddColumn, SchemaChangeAlterColumn, SchemaChangeDropColumn, SchemaChangeAddIndex, SchemaChangeAddForeignKey,
			SchemaChangeRenameTable, SchemaChangeRenameColumn, SchemaChangeCreateView, SchemaChangeDropView, SchemaChangeAddCheck, SchemaChangeDropConstraint, SchemaChangeDropTable)),
		validation.Field(&op.Table, validation.When(op.HasTable(), validation.Required), validation.Length(0, 63), validation.Match(schemaChangeIdentifier)),
		validation.Field(&op.SQL, validation.When(op.needsSQL(), validation.Required), validation.Length(0, 10000)),
		validation.Field(&op.Name, validation.When(op.needsName(), validation.Required), validation.Length(0, 63), validation.Match(schemaChangeIdentifier)),
		validation.Field(&op.ColumnName, validation.Match(schemaChangeIdentifier)),
		validation.Field(&op.IndexColumns, validation.Each(validation.Match(schemaChangeIdentifier))),
		validation.Field(&op.RefTable, validation.Match(schemaChangeIdentifier)),
		validation.Field(&op.FkColumns, validation.Each(validation.Match(schemaChangeIdentifier))),
		validation.Field(&op.RefColumns, validation.Each(validation.Match(schemaChangeIdentifier))),
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
	case SchemaChangeAddColumn, SchemaChangeAlterColumn:
		if op.Column == nil {
			return fmt.Errorf("%s %q: column is required", op.Op, op.Table)
		}

		if err := op.Column.Validate(); err != nil {
			return fmt.Errorf("%s %q: %w", op.Op, op.Table, err)
		}
	case SchemaChangeAddCheck:
		// The expression goes into the DDL as written: one expression, no statement breaks or comments.
		if strings.ContainsAny(op.SQL, ";") || strings.Contains(op.SQL, "--") || strings.Contains(op.SQL, "/*") {
			return fmt.Errorf("%s %q: the check must be one expression without ';' or comments", op.Op, op.Table)
		}
	case SchemaChangeDropColumn, SchemaChangeRenameColumn:
		if op.ColumnName == "" {
			return fmt.Errorf("%s %q: columnName is required", op.Op, op.Table)
		}
	case SchemaChangeAddIndex:
		if len(op.IndexColumns) == 0 {
			return fmt.Errorf("%s %q: indexColumns are required", op.Op, op.Table)
		}
	case SchemaChangeAddForeignKey:
		if op.RefTable == "" || len(op.FkColumns) == 0 || len(op.FkColumns) != len(op.RefColumns) {
			return fmt.Errorf("%s %q: fkColumns, refTable and matching refColumns are required", op.Op, op.Table)
		}
	}

	return nil
}

// HasTable reports whether the op works on one table.
func (op SchemaChangeOp) HasTable() bool {
	return !op.IsScopeOp() && !op.IsViewOp() && op.Op != SchemaChangeWrite && op.Op != SchemaChangeUndo
}

// IsViewOp reports whether the op creates or drops the view named by Name.
func (op SchemaChangeOp) IsViewOp() bool {
	return op.Op == SchemaChangeCreateView || op.Op == SchemaChangeDropView
}

// needsName: the new name for scope ops and renames, the view, or the constraint.
func (op SchemaChangeOp) needsName() bool {
	return op.IsScopeOp() || op.IsViewOp() || op.Op == SchemaChangeRenameTable || op.Op == SchemaChangeRenameColumn ||
		op.Op == SchemaChangeAddCheck || op.Op == SchemaChangeDropConstraint
}

// needsSQL: the statement of a data change or undo, the SELECT of a view, or the expression of a check.
func (op SchemaChangeOp) needsSQL() bool {
	return op.Op == SchemaChangeWrite || op.Op == SchemaChangeUndo || op.Op == SchemaChangeCreateView || op.Op == SchemaChangeAddCheck
}

// IsScopeOp reports whether the op creates the database or schema the other ops work in.
func (op SchemaChangeOp) IsScopeOp() bool {
	return op.Op == SchemaChangeCreateDatabase || op.Op == SchemaChangeCreateSchema
}

// ForeignKeyName is the deterministic constraint name used for agent-proposed
// foreign keys, so the diagram edge id and the applied constraint agree.
func (op SchemaChangeOp) ForeignKeyName() string {
	return boundedName(fmt.Sprintf("fk_%s_%s_%s", op.Table, strings.Join(op.FkColumns, "_"), op.RefTable))
}

// IndexName is the deterministic name used for agent-proposed indexes.
func (op SchemaChangeOp) IndexName() string {
	return boundedName(fmt.Sprintf("idx_%s_%s", op.Table, strings.Join(op.IndexColumns, "_")))
}

// boundedName caps a generated identifier at 63 characters (Postgres limit)
// with a hash suffix so truncation stays unique.
func boundedName(name string) string {
	if len(name) <= maxIdentifierLen {
		return name
	}

	sum := sha1.Sum([]byte(name))

	return name[:maxIdentifierLen-9] + "_" + hex.EncodeToString(sum[:4])
}
