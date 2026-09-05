package databaseContract

import (
	"fmt"
	"strings"

	"github.com/invopop/validation"
)

// Query-flow types shared by the HTTP layer and every database driver live
// here so the contract never depends on the app DTO package; internal/app/dto
// re-exports them as aliases.

type (
	RunQueryRequest struct {
		ConnectionID int32       `json:"connectionId"`
		NodeID       string      `json:"nodeId"`
		Limit        *int        `json:"limit"`
		Page         *int        `json:"page"`
		InlineQuery  *string     `json:"inlineQuery"`
		Filters      []FilterDto `json:"filters"`
		Sorts        []SortDto   `json:"sorts"`
		Columns      []string
	}

	RunQueryResponse struct {
		Query   string           `json:"query"`
		Data    []map[string]any `json:"data"`
		Columns []Column         `json:"columns"`
	}

	FilterDto struct {
		Column   string `json:"column"`
		Operator string `json:"operator"`
		Value    string `json:"value"`
		Next     string `json:"next"`
	}

	SortDto struct {
		Column   string `json:"column"`
		Operator string `json:"operator"`
	}

	RawQueryRequest struct {
		ConnectionID int32   `json:"connectionId"`
		Query        string  `json:"query"`
		Database     *string `json:"database"`
		Schema       *string `json:"schema"`
		Confirmed    bool    `json:"confirmed"`
		Limit        *int    `json:"limit"`
		Page         *int    `json:"page"`
	}

	RawQueryResponse struct {
		Query          string           `json:"query"`
		Data           []map[string]any `json:"data"`
		Columns        []Column         `json:"columns"`
		Editable       bool             `json:"editable"`
		NodeID         string           `json:"nodeId"`
		EditableReason *string          `json:"editableReason"`
		DrivingTable   *string          `json:"drivingTable"`
		Paginated      bool             `json:"paginated"`
		Limit          int              `json:"limit"`
		Page           int              `json:"page"`
	}

	Column struct {
		Name              string   `json:"name"`
		Type              string   `json:"type"`
		NotNull           bool     `json:"notNull"`
		Length            *int64   `json:"length"`
		Default           *string  `json:"default"`
		Comment           *string  `json:"comment"`
		MappedType        string   `json:"mappedType"`
		Editable          bool     `json:"editable"`
		IsActive          bool     `json:"isActive"`
		IsPrimaryKey      bool     `json:"isPrimaryKey"`
		IsForeignKey      bool     `json:"isForeignKey"`
		ReferencedSchema  *string  `json:"referencedSchema,omitempty"`
		ReferencedTable   *string  `json:"referencedTable,omitempty"`
		ReferencedColumns []string `json:"referencedColumns,omitempty"`
		LocalColumns      []string `json:"localColumns,omitempty"`
		EnumValues        []string `json:"enumValues,omitempty"`
		SourceTable       *string  `json:"sourceTable"`
		SourceColumn      *string  `json:"sourceColumn"`
	}

	UpdateQueryRequest struct {
		ConnectionID int32            `json:"connectionId"`
		NodeID       string           `json:"nodeId"`
		EditedItems  []EditedItem     `json:"edited"`
		DeletedItems []map[string]any `json:"deleted"`
		AddedItems   []map[string]any `json:"added"`
		Confirmed    bool             `json:"confirmed"`
	}

	UpdateQueryResponse struct {
		Query        []string `json:"query"`
		RowsAffected int      `json:"rowAffected"`
	}

	EditedItem struct {
		Conditions map[string]any `json:"conditions"`
		Values     map[string]any `json:"values"`
	}

	AutoCompleteRequest struct {
		ConnectionID int32   `query:"connectionId"`
		Database     *string `query:"database"`
		Schema       *string `query:"schema"`
	}

	AutoCompleteResponse struct {
		Databases []string            `json:"databases"`
		Views     []string            `json:"views"`
		Schemas   []string            `json:"schemas"`
		Tables    []string            `json:"tables"`
		Columns   map[string][]string `json:"columns"`
	}

	// ImportJob is the background-job payload for a data import.
	ImportJob struct {
		OwnerID         string
		ConnectionID    int32
		Table           string
		Data            []byte
		Format          string
		ContinueOnError bool
		SkipErrors      bool
		MaxErrors       int
	}

	AiChatRequest struct {
		ConnectionID int32             `json:"connectionId"`
		Message      string            `json:"message"`
		ChatID       *int32            `json:"chatId"`
		ContextOpts  *AiContextOptions `json:"contextOpts"`
	}

	AiInlineCompleteRequest struct {
		ConnectionID int32                          `json:"connectionId"`
		ContextOpts  AiInlineCompleteContextOptions `json:"contextOpts"`
	}

	AiInlineCompleteContextOptions struct {
		Database *string `json:"database"`
		Schema   *string `json:"schema"`
		Prompt   string  `json:"prompt"`
		Suffix   *string `json:"suffix"`
	}

	AiInlineCompleteResponse struct {
		Completion string `json:"completion"`
	}

	AiContextOptions struct {
		Query              *string  `json:"query"`
		SelectedQuery      *string  `json:"selectedQuery"`
		Database           *string  `json:"database"`
		Schema             *string  `json:"schema"`
		Tables             []string `json:"tables"`
		Views              []string `json:"views"`
		QueryResultSummary *string  `json:"queryResultSummary"`
		ObjectDefinition   *string  `json:"objectDefinition"`
	}
)

func (req RunQueryRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.NodeID, validation.Required, validation.Length(0, 120)),
		validation.Field(&req.Limit, validation.Min(1)),
		validation.Field(&req.Page, validation.Min(1)),
		validation.Field(&req.Filters),
		validation.Field(&req.Sorts),
		validation.Field(&req.Columns, validation.Each(validation.Length(0, 120))),
	)
}

func (req FilterDto) Validate() error {
	rules := []*validation.FieldRules{
		validation.Field(&req.Column, validation.Required, validation.Length(0, 120)),
		validation.Field(&req.Operator, validation.Required, validation.By(func(value any) error {
			if !FilterOperatorAllowed(value.(string)) {
				return fmt.Errorf("operator is not allowed")
			}

			return nil
		})),
		validation.Field(&req.Next, validation.Required, validation.In("AND", "OR")),
	}
	if FilterRequiresValue(req.Operator) {
		rules = append(rules, validation.Field(&req.Value, validation.Required))
	}

	return validation.ValidateStruct(&req, rules...)
}

func (req SortDto) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Column, validation.Required, validation.Length(0, 120)),
		validation.Field(&req.Operator, validation.Required, validation.In("ASC", "DESC")),
	)
}

func (req RawQueryRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Query, validation.Required),
		validation.Field(&req.Limit, validation.Min(1), validation.Max(10000)),
		validation.Field(&req.Page, validation.Min(1)),
	)
}

func (req UpdateQueryRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.NodeID, validation.Required, validation.Length(0, 120)),
		validation.Field(&req.EditedItems),
	)
}

func (req EditedItem) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Conditions, validation.Required),
		validation.Field(&req.Values, validation.Required),
	)
}

func (req AutoCompleteRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
	)
}

func (req AiChatRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Message, validation.Required, validation.Length(0, 10000)),
		validation.Field(&req.ChatID, validation.Min(0)),
	)
}

func (req AiInlineCompleteRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
	)
}

// allowedFilterOperators is an allow-list: the operator string is interpolated
// into SQL, so anything outside this set must be rejected.
var allowedFilterOperators = map[string]struct{}{
	"=":             {},
	"!=":            {},
	"<>":            {},
	"<":             {},
	"<=":            {},
	">":             {},
	">=":            {},
	"IS NULL":       {},
	"IS NOT NULL":   {},
	"LIKE_CONTAINS": {},
	"LIKE_STARTS":   {},
	"LIKE_ENDS":     {},
}

// FilterOperatorAllowed reports whether the operator may be interpolated into SQL.
func FilterOperatorAllowed(operator string) bool {
	_, ok := allowedFilterOperators[operator]

	return ok
}

func FilterRequiresValue(operator string) bool {
	return operator != "IS NULL" && operator != "IS NOT NULL"
}

func FilterIsLikeOperator(operator string) bool {
	switch operator {
	case "LIKE_CONTAINS", "LIKE_STARTS", "LIKE_ENDS":
		return true
	default:
		return false
	}
}

func escapeLikeValue(value string) string {
	value = strings.ReplaceAll(value, `\`, `\\`)
	value = strings.ReplaceAll(value, `%`, `\%`)
	value = strings.ReplaceAll(value, `_`, `\_`)

	return strings.ReplaceAll(value, "'", "''")
}

func escapeLiteralValue(value string) string {
	return strings.ReplaceAll(value, "'", "''")
}

func FilterPredicate(operator, value string) string {
	switch operator {
	case "IS NULL", "IS NOT NULL":
		return operator
	case "LIKE_CONTAINS":
		return fmt.Sprintf("LIKE '%%%s%%'", escapeLikeValue(value))
	case "LIKE_STARTS":
		return fmt.Sprintf("LIKE '%s%%'", escapeLikeValue(value))
	case "LIKE_ENDS":
		return fmt.Sprintf("LIKE '%%%s'", escapeLikeValue(value))
	default:
		return fmt.Sprintf("%s '%s'", operator, escapeLiteralValue(value))
	}
}
