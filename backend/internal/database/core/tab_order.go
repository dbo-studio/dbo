package databaseCore

import (
	"sort"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

var treeTabOrder = map[contract.TreeTab]int{
	contract.GeneralTab:            0,
	contract.DatabaseTab:           1,
	contract.SchemaTab:             2,
	contract.ViewTab:               3,
	contract.MaterializedViewTab:   4,
	contract.TableTab:              5,
	contract.TableColumnsTab:       10,
	contract.TableKeysTab:          11,
	contract.TableForeignKeysTab:   12,
	contract.TableIndexesTab:       13,
	contract.TableTriggersTab:      14,
	contract.TableChecksTab:        15,
	contract.TableStorageTab:       16,
	contract.TableSequenceTab:      17,
}

// SortedExecuteTabs returns execute payload tabs in deterministic SQL generation order.
func SortedExecuteTabs(executeParams map[contract.TreeTab]any) []contract.TreeTab {
	tabs := make([]contract.TreeTab, 0, len(executeParams))
	for tabID := range executeParams {
		tabs = append(tabs, tabID)
	}

	sort.Slice(tabs, func(i, j int) bool {
		left, leftOK := treeTabOrder[tabs[i]]
		right, rightOK := treeTabOrder[tabs[j]]

		switch {
		case leftOK && rightOK && left != right:
			return left < right
		case leftOK && !rightOK:
			return true
		case !leftOK && rightOK:
			return false
		default:
			return tabs[i] < tabs[j]
		}
	})

	return tabs
}
