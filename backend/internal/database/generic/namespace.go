package databaseGeneric

import (
	"fmt"
	"regexp"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

// Namespaces (schemas for SQL Server, databases for ClickHouse) are created and dropped from the tree.
// Create uses the Object Form with one field; the field ids are the ones the shared identity resolver reads
// ("nspname" for a schema, "datname" for a database), so the tree can open the new node afterwards.

var namespaceName = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]{0,127}$`)

func (r *Repository) namespaceTab() contract.TreeTab {
	return lo.Ternary(r.d.NamespaceIsSchema(), contract.SchemaTab, contract.DatabaseTab)
}

func (r *Repository) namespaceField() string {
	return lo.Ternary(r.d.NamespaceIsSchema(), "nspname", "datname")
}

func (r *Repository) isCreateNamespace(action contract.TreeNodeActionName) bool {
	return action == lo.Ternary(r.d.NamespaceIsSchema(), contract.CreateSchemaAction, contract.CreateDatabaseAction)
}

func (r *Repository) isDropNamespace(action contract.TreeNodeActionName) bool {
	return action == lo.Ternary(r.d.NamespaceIsSchema(), contract.DropSchemaAction, contract.DropDatabaseAction)
}

func (r *Repository) namespaceKind() string {
	return lo.Ternary(r.d.NamespaceIsSchema(), "schema", "database")
}

func (r *Repository) createNamespaceForm() (*contract.FormResponse, error) {
	return r.base.BuildGeneralFormResponse([]contract.FormField{
		{ID: r.namespaceField(), Name: "Name", Type: contract.FormFieldTypeText, Required: true},
	}, nil)
}

func (r *Repository) namespaceStatements(nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	if r.isDropNamespace(action) {
		ns, _ := object(nodeID)
		if ns == "" || r.d.ProtectedNamespace(ns) {
			return nil, apperror.Validation(fmt.Errorf("the %s %q cannot be dropped", r.namespaceKind(), ns))
		}

		return []string{r.d.DropNamespace(ns)}, nil
	}

	tabs, err := helper.ConvertToDTO[map[contract.TreeTab]*struct {
		New map[string]any `json:"new"`
	}](params)
	if err != nil {
		return nil, apperror.Validation(err)
	}

	tab := tabs[r.namespaceTab()]
	if tab == nil {
		tab = tabs[contract.GeneralTab]
	}

	var name string
	if tab != nil {
		name, _ = tab.New[r.namespaceField()].(string)
	}

	if !namespaceName.MatchString(name) {
		return nil, apperror.Validation(fmt.Errorf("a %s name is letters, digits and underscores, and does not start with a digit", r.namespaceKind()))
	}

	return []string{r.d.CreateNamespace(name)}, nil
}
