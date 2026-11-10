package databaseGeneric

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
)

func Options(values ...string) []contract.FormFieldOption {
	return lo.Map(values, func(v string, _ int) contract.FormFieldOption { return contract.FormFieldOption{Value: v, Label: v} })
}

// splitType turns "decimal(10,2)" into ("decimal", "10", "2").
func SplitType(full string) (base, length, scale string) {
	base, rest, found := strings.Cut(full, "(")
	if !found {
		return full, "", ""
	}

	length, scale, _ = strings.Cut(strings.TrimSuffix(rest, ")"), ",")

	return strings.TrimSpace(base), strings.TrimSpace(length), strings.TrimSpace(scale)
}

func SQLDefault(expr string) string {
	if expr == "" {
		return ""
	}

	return " DEFAULT " + expr
}

func NewColSpec(d *dto.MysqlTableColumnData, typeText string) ColSpec {
	return ColSpec{
		Name:      lo.FromPtr(d.Name),
		Type:      typeText,
		NotNull:   lo.FromPtr(d.NotNull),
		Primary:   lo.FromPtr(d.Primary),
		Identity:  lo.FromPtr(d.IsIdentity),
		Default:   strings.TrimSpace(lo.FromPtr(d.Default)),
		Generated: lo.FromPtr(d.IsGenerated),
	}
}

func RequireName(d *dto.MysqlTableColumnData) error {
	if strings.TrimSpace(lo.FromPtr(d.Name)) == "" || strings.TrimSpace(lo.FromPtr(d.DataType)) == "" {
		return fmt.Errorf("a column needs a name and a data type")
	}

	return nil
}

// CheckGenerated validates a generated column: it needs an expression, and the expression stays one expression.
func CheckGenerated(c ColSpec) error {
	if !c.Generated {
		return nil
	}

	if c.Default == "" {
		return fmt.Errorf("a generated column needs an expression in Default")
	}

	if strings.Contains(c.Default, ";") || strings.Contains(c.Default, "--") || strings.Contains(c.Default, "/*") {
		return fmt.Errorf("the generated expression must be a single expression")
	}

	return nil
}
