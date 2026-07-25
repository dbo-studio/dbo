package serviceAiProvider

// StreamEvent represents a single event emitted during a streaming chat response.
type StreamEvent struct {
	Type       string `json:"type"`
	Label      string `json:"label,omitempty"`
	Content    string `json:"content,omitempty"`
	DurationMs int64  `json:"durationMs,omitempty"`
	BlockType  string `json:"blockType,omitempty"`
	Language   string `json:"language,omitempty"`
}

// StreamChatCallback is invoked for each streaming event during a chat completion.
type StreamChatCallback func(event StreamEvent) error
