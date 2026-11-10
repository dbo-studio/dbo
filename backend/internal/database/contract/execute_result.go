package databaseContract

type ExecuteResult struct {
	NodeID     string             `json:"nodeId,omitempty"`
	NextAction TreeNodeActionName `json:"nextAction,omitempty"`
}

// ExecuteStep is one Execute call, described so a driver can run several of
// them as a unit.
type ExecuteStep struct {
	NodeID string
	Action TreeNodeActionName
	Params []byte
}
