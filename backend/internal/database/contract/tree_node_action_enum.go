package databaseContract

type TreeNodeActionType string

const (
	TreeNodeActionTypeForm    TreeNodeActionType = "form"
	TreeNodeActionTypeAction  TreeNodeActionType = "action"
	TreeNodeActionTypeCommand TreeNodeActionType = "command"
	TreeNodeActionTypeRoute   TreeNodeActionType = "route"
)
