package dto

// RoutineParams is the function / procedure form shared by PostgreSQL and
// MySQL. Parameters and Returns are the SQL text of the parameter list and the
// return type; Language is PostgreSQL only, Deterministic and Comment MySQL only.
type RoutineParams struct {
	New *RoutineData `json:"new"`
	Old *RoutineData `json:"old"`
}

type RoutineData struct {
	Name          *string `json:"name"`
	Language      *string `json:"language"`
	Parameters    *string `json:"parameters"`
	Returns       *string `json:"returns"`
	Body          *string `json:"body"`
	Deterministic *bool   `json:"deterministic"`
	Comment       *string `json:"comment"`
}
