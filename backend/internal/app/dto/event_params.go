package dto

// EventParams is the MySQL scheduled event form. Schedule is the SQL text after
// ON SCHEDULE, e.g. "EVERY 1 DAY" or "AT '2030-01-01 00:00:00'".
type EventParams struct {
	New *EventData `json:"new"`
	Old *EventData `json:"old"`
}

type EventData struct {
	Name     *string `json:"name"`
	Schedule *string `json:"schedule"`
	Status   *string `json:"status"`
	Preserve *bool   `json:"preserve"`
	Comment  *string `json:"comment"`
	Body     *string `json:"body"`
}
