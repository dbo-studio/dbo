package ddlSqlite

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func columnRows(input TableInput) []dto.SQLiteTableColumn {
	if input.ColumnParams == nil {
		return nil
	}

	return input.ColumnParams.Columns
}

func foreignKeyRows(input TableInput) []dto.SQLiteTableForeignKey {
	if input.ForeignKeyParams == nil {
		return nil
	}

	return input.ForeignKeyParams.Columns
}

func keyRows(input TableInput) []dto.SQLiteTableKey {
	if input.KeyParams == nil {
		return nil
	}

	return input.KeyParams.Keys
}

func indexRows(input TableInput) []dto.SQLiteIndex {
	if input.IndexParams == nil {
		return nil
	}

	return input.IndexParams.Indexes
}

func filterActiveColumns(columns []dto.SQLiteTableColumn) []dto.SQLiteTableColumn {
	return lo.Filter(columns, func(col dto.SQLiteTableColumn, _ int) bool {
		if col.Added != nil && col.Deleted != nil && *col.Added && *col.Deleted {
			return false
		}

		if lo.FromPtr(col.Deleted) && !lo.FromPtr(col.Added) {
			return false
		}

		if col.Added == nil || *col.Added {
			return true
		}

		return col.New != nil
	})
}

func filterActiveForeignKeys(foreignKeys []dto.SQLiteTableForeignKey) []dto.SQLiteTableForeignKey {
	return lo.Filter(foreignKeys, func(fk dto.SQLiteTableForeignKey, _ int) bool {
		if fk.Added != nil && fk.Deleted != nil && *fk.Added && *fk.Deleted {
			return false
		}

		if fk.Added == nil || *fk.Added {
			return true
		}

		return fk.New != nil
	})
}

func filterActiveKeys(keys []dto.SQLiteTableKey) []dto.SQLiteTableKey {
	return lo.Filter(keys, func(key dto.SQLiteTableKey, _ int) bool {
		if key.Added != nil && key.Deleted != nil && *key.Added && *key.Deleted {
			return false
		}

		if key.Added == nil || *key.Added {
			return true
		}

		return key.New != nil
	})
}

func columnDefinitions(columns []dto.SQLiteTableColumn) string {
	if len(columns) == 0 {
		return ""
	}

	defs := make([]string, 0, len(columns))
	for _, col := range columns {
		if def := singleColumnDefinition(col); def != "" {
			defs = append(defs, def)
		}
	}

	return strings.Join(defs, ", ")
}

func singleColumnDefinition(col dto.SQLiteTableColumn) string {
	if col.New == nil {
		return ""
	}

	name := quote.SqliteIdent(lo.FromPtr(col.New.Name))
	dataType := lo.FromPtr(col.New.DataType)
	def := fmt.Sprintf("%s %s", name, dataType)

	if isGeneratedColumnKind(col.New.ColumnKind) {
		return generatedColumnDefinition(def, col.New)
	}

	if col.New.NotNull != nil && *col.New.NotNull {
		def += " NOT NULL"
	}

	if col.New.Default != nil && *col.New.Default != "" {
		def += fmt.Sprintf(" DEFAULT %s", *col.New.Default)
	}

	if col.New.CollectionName != nil && *col.New.CollectionName != "" && *col.New.CollectionName != "stored" {
		def += fmt.Sprintf(" COLLATE %s", *col.New.CollectionName)
	}

	if col.New.OnNullConflicts != nil && *col.New.OnNullConflicts != "" {
		def += fmt.Sprintf(" ON CONFLICT %s", *col.New.OnNullConflicts)
	}

	return def
}

func generatedColumnDefinition(baseDef string, colData *dto.SQLiteTableColumnData) string {
	def := baseDef + " GENERATED ALWAYS AS"

	if colData.Default != nil && *colData.Default != "" {
		def += fmt.Sprintf(" (%s)", *colData.Default)
	}

	if isStoredGeneratedColumn(colData) {
		def += " STORED"
	} else {
		def += " VIRTUAL"
	}

	return def
}

func isGeneratedColumnKind(kind *string) bool {
	switch strings.ToUpper(lo.FromPtr(kind)) {
	case "GENERATED", "GENERATED_VIRTUAL", "GENERATED_STORED":
		return true
	default:
		return false
	}
}

func isStoredGeneratedColumn(colData *dto.SQLiteTableColumnData) bool {
	if strings.EqualFold(lo.FromPtr(colData.ColumnKind), "GENERATED_STORED") {
		return true
	}

	return colData.CollectionName != nil && *colData.CollectionName == "stored"
}

func foreignKeyDefinitions(foreignKeys []dto.SQLiteTableForeignKey) string {
	filtered := filterActiveForeignKeys(foreignKeys)
	if len(filtered) == 0 {
		return ""
	}

	defs := make([]string, 0, len(filtered))
	for _, fk := range filtered {
		if def := singleForeignKeyDefinition(fk); def != "" {
			defs = append(defs, def)
		}
	}

	return strings.Join(defs, ", ")
}

func singleForeignKeyDefinition(fk dto.SQLiteTableForeignKey) string {
	if fk.New == nil {
		return ""
	}

	var parts []string

	if fk.New.ConstraintName != nil && *fk.New.ConstraintName != "" {
		parts = append(parts, fmt.Sprintf("CONSTRAINT %s", quote.SqliteIdent(*fk.New.ConstraintName)))
	}

	parts = append(parts, "FOREIGN KEY")
	parts = append(parts, fmt.Sprintf("(%s)", quoteColumnList(fk.New.SourceColumns)))
	parts = append(parts, "REFERENCES")
	parts = append(parts, quote.SqliteIdent(lo.FromPtr(fk.New.TargetTable)))

	if len(fk.New.TargetColumns) > 0 {
		parts = append(parts, fmt.Sprintf("(%s)", quoteColumnList(fk.New.TargetColumns)))
	}

	if fk.New.OnUpdate != nil && *fk.New.OnUpdate != "" {
		parts = append(parts, fmt.Sprintf("ON UPDATE %s", *fk.New.OnUpdate))
	}

	if fk.New.OnDelete != nil && *fk.New.OnDelete != "" {
		parts = append(parts, fmt.Sprintf("ON DELETE %s", *fk.New.OnDelete))
	}

	if fk.New.IsDeferrable != nil && *fk.New.IsDeferrable {
		parts = append(parts, "DEFERRABLE")
		if fk.New.InitiallyDeferred != nil && *fk.New.InitiallyDeferred {
			parts = append(parts, "INITIALLY DEFERRED")
		}
	}

	return strings.Join(parts, " ")
}

func keyDefinitions(keys []dto.SQLiteTableKey) string {
	filtered := filterActiveKeys(keys)
	if len(filtered) == 0 {
		return ""
	}

	defs := make([]string, 0, len(filtered))
	for _, key := range filtered {
		if def := singleKeyDefinition(key); def != "" {
			defs = append(defs, def)
		}
	}

	return strings.Join(defs, ", ")
}

func singleKeyDefinition(key dto.SQLiteTableKey) string {
	if key.New == nil {
		return ""
	}

	keyType := sqliteKeyType(key.New.Type)
	if keyType == "" {
		return ""
	}

	var parts []string

	if key.New.Name != nil && *key.New.Name != "" {
		parts = append(parts, fmt.Sprintf("CONSTRAINT %s", quote.SqliteIdent(*key.New.Name)))
	}

	parts = append(parts, keyType)

	if len(key.New.Columns) > 0 {
		parts = append(parts, fmt.Sprintf("(%s)", quoteColumnList(key.New.Columns)))
	}

	return strings.Join(parts, " ")
}

func sqliteKeyType(keyType *string) string {
	if keyType == nil {
		return ""
	}

	switch *keyType {
	case "PRIMARY", "PRIMARY KEY":
		return "PRIMARY KEY"
	case "UNIQUE":
		return "UNIQUE"
	default:
		return ""
	}
}

func quoteColumnList(columns []string) string {
	quoted := make([]string, len(columns))
	for i, col := range columns {
		quoted[i] = quote.SqliteIdent(col)
	}

	return strings.Join(quoted, ", ")
}

func commonColumns(columns []dto.SQLiteTableColumn) []string {
	common := make([]string, 0)

	for _, col := range columns {
		if isColumnAddedOrDeleted(col) {
			continue
		}

		colName := columnName(col)
		if colName != "" {
			common = append(common, quote.SqliteIdent(colName))
		}
	}

	return common
}

func isColumnAddedOrDeleted(col dto.SQLiteTableColumn) bool {
	return (col.Added != nil && *col.Added) || (col.Deleted != nil && *col.Deleted)
}

func columnName(col dto.SQLiteTableColumn) string {
	if col.New != nil && col.New.Name != nil {
		return *col.New.Name
	}

	if col.Old != nil && col.Old.Name != nil {
		return *col.Old.Name
	}

	return ""
}

func isIndexRenamed(idx dto.SQLiteIndex) bool {
	return idx.New != nil && idx.Old != nil &&
		idx.New.Name != nil && idx.Old.Name != nil &&
		*idx.New.Name != *idx.Old.Name
}
