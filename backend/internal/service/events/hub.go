// Package serviceEvents is the in-process fan-out behind GET /api/events: services publish an event
// for an owner, and every open stream of that owner receives it.
package serviceEvents

import "sync"

const subscriberBuffer = 64

// Event is one server-sent event. Data is marshaled to JSON by the stream handler.
type Event struct {
	Type string `json:"type"`
	Data any    `json:"data"`
}

// IHub delivers events to the streams of one owner. It is a wake-up signal, not a log: a slow stream
// drops events, and clients refetch from the database when they (re)connect.
type IHub interface {
	Subscribe(ownerID string) (events <-chan Event, unsubscribe func())
	Publish(ownerID string, event Event)
}

type hub struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan Event]struct{}
}

func NewHub() IHub {
	return &hub{subscribers: map[string]map[chan Event]struct{}{}}
}

func (h *hub) Subscribe(ownerID string) (<-chan Event, func()) {
	ch := make(chan Event, subscriberBuffer)

	h.mu.Lock()
	if h.subscribers[ownerID] == nil {
		h.subscribers[ownerID] = map[chan Event]struct{}{}
	}

	h.subscribers[ownerID][ch] = struct{}{}
	h.mu.Unlock()

	return ch, func() {
		h.mu.Lock()
		defer h.mu.Unlock()

		if _, ok := h.subscribers[ownerID][ch]; ok {
			delete(h.subscribers[ownerID], ch)
			close(ch)
		}

		if len(h.subscribers[ownerID]) == 0 {
			delete(h.subscribers, ownerID)
		}
	}
}

func (h *hub) Publish(ownerID string, event Event) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for ch := range h.subscribers[ownerID] {
		select {
		case ch <- event:
		default: // full: the client refetches on reconnect
		}
	}
}
