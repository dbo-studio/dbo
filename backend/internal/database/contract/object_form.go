package databaseContract

import "context"

// ObjectFormProvider is the object-form half of a driver: the tabs, fields and statements behind a
// create or edit form. SQL drivers get it through DatabaseRepository; a NoSQL driver implements it to
// reuse the same tree routes and form UI, with shell statements as the preview.
type ObjectFormProvider interface {
	GetFormTabs(ctx context.Context, action TreeNodeActionName) []FormTab
	Objects(ctx context.Context, nodeID string, tabID TreeTab, action TreeNodeActionName) (*FormResponse, error)
	Execute(ctx context.Context, nodeID string, action TreeNodeActionName, params []byte) (*ExecuteResult, error)
	PreviewExecute(ctx context.Context, nodeID string, action TreeNodeActionName, params []byte) ([]string, error)
}
