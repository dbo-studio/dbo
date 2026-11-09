package databaseGeneric

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
)

// Object forms cover tables (name + columns) and views. Keys, indexes, foreign keys, triggers and
// routines are not implemented; their tabs are not offered.
func (r *Repository) GetFormTabs(_ context.Context, action contract.TreeNodeActionName) []contract.FormTab {
	if r.isCreateNamespace(action) {
		return []contract.FormTab{{ID: r.namespaceTab(), Name: lo.Ternary(r.d.NamespaceIsSchema(), "Schema", "Database")}}
	}

	if procedure, ok := isRoutineAction(action); ok {
		if _, supported := r.routineDialect(); supported {
			return []contract.FormTab{{ID: routineTab(procedure), Name: lo.Ternary(procedure, "Procedure", "Function")}}
		}
	}

	switch action {
	case contract.CreateTableAction, contract.EditTableAction:
		tabs := []contract.FormTab{{ID: contract.TableColumnsTab, Name: "Columns"}}

		if c, ok := r.constraints(); ok {
			names := map[contract.TreeTab]string{
				contract.TableKeysTab: "Keys", contract.TableIndexesTab: "Indexes", contract.TableForeignKeysTab: "Foreign Keys",
				contract.TableChecksTab: "Checks", contract.TableTriggersTab: "Triggers",
			}
			order := []contract.TreeTab{contract.TableKeysTab, contract.TableIndexesTab, contract.TableForeignKeysTab, contract.TableChecksTab, contract.TableTriggersTab}

			for _, tab := range order {
				if lo.Contains(c.Tabs(), tab) {
					tabs = append(tabs, contract.FormTab{ID: tab, Name: names[tab]})
				}
			}
		}

		return tabs
	case contract.CreateViewAction, contract.EditViewAction:
		return []contract.FormTab{{ID: contract.ViewTab, Name: "View"}}
	default:
		return []contract.FormTab{}
	}
}
