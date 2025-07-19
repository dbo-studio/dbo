package databaseContract

type TreeNodeType string

const (
	RootNodeType                      TreeNodeType = "root"
	DatabaseNodeType                  TreeNodeType = "database"
	DatabaseContainerNodeType         TreeNodeType = "databaseContainer"
	SchemaNodeType                    TreeNodeType = "schema"
	TableContainerNodeType            TreeNodeType = "tableContainer"
	ViewContainerNodeType             TreeNodeType = "viewContainer"
	MaterializedViewContainerNodeType TreeNodeType = "materializedViewContainer"
	TableNodeType                     TreeNodeType = "table"
	ViewNodeType                      TreeNodeType = "view"
	MaterializedViewNodeType          TreeNodeType = "materializedView"
)
