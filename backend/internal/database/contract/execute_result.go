package databaseContract

type ExecuteResult struct {
	NodeID     string             `json:"nodeId,omitempty"`
	NextAction TreeNodeActionName `json:"nextAction,omitempty"`
}
