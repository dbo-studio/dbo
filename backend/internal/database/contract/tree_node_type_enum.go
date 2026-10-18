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
	SequenceContainerNodeType         TreeNodeType = "sequenceContainer"
	TypeContainerNodeType             TreeNodeType = "typeContainer"
	TableNodeType                     TreeNodeType = "table"
	ViewNodeType                      TreeNodeType = "view"
	MaterializedViewNodeType          TreeNodeType = "materializedView"
	SequenceNodeType                  TreeNodeType = "sequence"
	TypeNodeType                      TreeNodeType = "type"
)
