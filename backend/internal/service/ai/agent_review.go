package serviceAi

import (
	"context"
	"fmt"
	"regexp"
	"slices"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	serviceDbtools "github.com/dbo-studio/dbo/internal/service/dbtools"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
)

// maxReviewTables bounds one review; a bigger schema is reviewed table set by table set.
const maxReviewTables = 50

var camelCase = regexp.MustCompile(`[a-z][A-Z]`)

// schemaSuggestion is one finding of review_schema. Ops, when present, fix it as a proposal the user reviews.
type schemaSuggestion struct {
	Kind    string               `json:"kind"`
	Table   string               `json:"table"`
	Message string               `json:"message"`
	Ops     []dto.SchemaChangeOp `json:"ops,omitempty"`
}

type reviewSchemaArgs struct {
	Tables []string `json:"tables"`
}

// reviewSchema reads the tables (all of them when none are named) and lists what looks wrong with their design.
func (s *AiServiceImpl) reviewSchema(ctx context.Context, rawArgs string, toolCtx serviceDbtools.ToolContext) (string, error) {
	var args reviewSchemaArgs
	if rawArgs != "" {
		if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
			return "", fmt.Errorf("invalid arguments: %w", err)
		}
	}

	all, err := s.toolRegistry.Execute(ctx, serviceDbtools.ToolListTables, map[string]any{}, toolCtx)
	if err != nil {
		return "", err
	}

	var tables []string
	if err := json.Unmarshal([]byte(all), &tables); err != nil {
		return "", fmt.Errorf("could not read the table list: %w", err)
	}

	reviewed := lo.Ternary(len(args.Tables) > 0, lo.Intersect(args.Tables, tables), tables)
	note := ""

	if len(reviewed) > maxReviewTables {
		note = fmt.Sprintf("only the first %d of %d tables were reviewed; name tables to review the rest", maxReviewTables, len(reviewed))
		reviewed = reviewed[:maxReviewTables]
	}

	structures, err := s.schemaService.TableStructures(ctx, &dto.SchemaChangeRequest{
		ConnectionID: toolCtx.ConnectionID,
		Database:     toolCtx.Database,
		Schema:       toolCtx.Schema,
		Ops:          lo.Map(reviewed, func(table string, _ int) dto.SchemaChangeOp { return dto.SchemaChangeOp{Table: table} }),
	})
	if err != nil {
		return "", err
	}

	raw, err := json.Marshal(map[string]any{
		"database":    lo.FromPtr(toolCtx.Database),
		"schema":      lo.FromPtr(toolCtx.Schema),
		"tables":      len(reviewed),
		"suggestions": reviewTables(structures, tables),
		"note":        note,
	})
	if err != nil {
		return "", err
	}

	return string(raw), nil
}

// reviewTables applies the design rules to the reviewed tables; known lists every table, for guessing foreign keys.
func reviewTables(structures map[string]*contract.TableStructure, known []string) []schemaSuggestion {
	suggestions := []schemaSuggestion{}
	names := lo.Keys(structures)
	slices.Sort(names)

	snake, camel := 0, 0

	for _, table := range names {
		structure := structures[table]
		keys := lo.FilterMap(structure.Columns, func(column contract.StructureColumn, _ int) (string, bool) {
			return column.Name, column.IsPrimaryKey
		})
		column := func(name string) (contract.StructureColumn, bool) {
			return lo.Find(structure.Columns, func(item contract.StructureColumn) bool { return item.Name == name })
		}
		// An index serves a foreign key when the key's columns lead it.
		indexed := func(columns []string) bool {
			leads := func(index []string) bool {
				return len(index) >= len(columns) && slices.Equal(index[:len(columns)], columns)
			}

			return leads(keys) || lo.ContainsBy(structure.Indexes, func(index contract.StructureIndex) bool { return leads(index.Columns) })
		}

		if len(keys) == 0 {
			suggestions = append(suggestions, schemaSuggestion{
				Kind: "no_primary_key", Table: table,
				Message: table + " has no primary key, so rows cannot be told apart, edited safely or referenced.",
			})
		}

		for _, fk := range structure.ForeignKeys {
			if !indexed(fk.Columns) {
				suggestions = append(suggestions, schemaSuggestion{
					Kind: "foreign_key_without_index", Table: table,
					Message: fmt.Sprintf("%s(%s) references %s but has no index, so joins and deletes on %s scan %s.",
						table, strings.Join(fk.Columns, ", "), fk.RefTable, fk.RefTable, table),
					Ops: []dto.SchemaChangeOp{{Op: dto.SchemaChangeAddIndex, Table: table, IndexColumns: fk.Columns}},
				})
			}

			for _, name := range fk.Columns {
				if live, ok := column(name); ok && !live.NotNull {
					suggestions = append(suggestions, schemaSuggestion{
						Kind: "nullable_foreign_key", Table: table,
						Message: fmt.Sprintf("%s.%s may be NULL, so a row can exist without its %s. Make it NOT NULL if every row needs one.", table, name, fk.RefTable),
						Ops: []dto.SchemaChangeOp{{
							Op: dto.SchemaChangeAlterColumn, Table: table,
							Column: &dto.SchemaChangeColumn{Name: name, Type: live.DataType, NotNull: true},
						}},
					})
				}
			}
		}

		for _, live := range structure.Columns {
			if lo.ContainsBy(structure.ForeignKeys, func(fk contract.StructureForeignKey) bool { return slices.Contains(fk.Columns, live.Name) }) {
				continue
			}

			stem, ok := strings.CutSuffix(strings.ToLower(live.Name), "_id")
			if !ok || stem == "" {
				continue
			}

			ref, found := lo.Find(known, func(name string) bool {
				lower := strings.ToLower(name)
				return lower != strings.ToLower(table) && (lower == stem || lower == stem+"s" || lower == stem+"es")
			})
			if !found {
				continue
			}

			suggestions = append(suggestions, schemaSuggestion{
				Kind: "missing_foreign_key", Table: table,
				Message: fmt.Sprintf("%s.%s looks like a reference to %s but has no foreign key, so it can point at rows that do not exist.", table, live.Name, ref),
				Ops: []dto.SchemaChangeOp{{
					Op: dto.SchemaChangeAddForeignKey, Table: table, FkColumns: []string{live.Name}, RefTable: ref, RefColumns: []string{"id"},
				}},
			})
		}

		seen := map[string]string{}

		for _, index := range structure.Indexes {
			key := strings.Join(index.Columns, ",")
			if other, ok := seen[key]; ok {
				suggestions = append(suggestions, schemaSuggestion{
					Kind: "duplicate_index", Table: table,
					Message: fmt.Sprintf("%s and %s index the same columns (%s) on %s; one of them only slows writes.", other, index.Name, strings.Join(index.Columns, ", "), table),
				})
			}

			seen[key] = index.Name
		}

		for _, name := range append([]string{table}, lo.Map(structure.Columns, func(column contract.StructureColumn, _ int) string { return column.Name })...) {
			switch {
			case camelCase.MatchString(name):
				camel++
			case strings.Contains(name, "_"):
				snake++
			}
		}
	}

	if snake > 0 && camel > 0 {
		suggestions = append(suggestions, schemaSuggestion{
			Kind:    "mixed_naming",
			Message: fmt.Sprintf("Names mix snake_case (%d) and camelCase (%d); pick one so queries are predictable.", snake, camel),
		})
	}

	return suggestions
}
