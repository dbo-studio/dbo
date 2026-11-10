package databasePostgres

import (
	"fmt"
	"strconv"
	"strings"
)

// Overloaded routines share a name, so the tree node id carries the pg_proc oid:
// "name~12345". Without it, editing or dropping one overload could hit another.
func routineNodeName(routine Routine) string {
	return fmt.Sprintf("%s~%d", routine.Name, routine.OID)
}

// splitRoutineNode returns the routine name and oid of a node's last id segment. The oid
// is 0 when the id carries none (e.g. right after a create).
func splitRoutineNode(segment string) (string, int64) {
	name, oid, found := strings.Cut(segment, "~")
	if !found {
		return segment, 0
	}

	parsed, err := strconv.ParseInt(oid, 10, 64)
	if err != nil {
		return segment, 0
	}

	return name, parsed
}

// findRoutine picks one routine by oid, or by name when the name is unambiguous. An
// ambiguous bare name is an error: guessing could edit or drop the wrong overload.
func findRoutine(routines []Routine, segment string) (*Routine, error) {
	name, oid := splitRoutineNode(segment)

	var matches []*Routine

	for i := range routines {
		if (oid != 0 && routines[i].OID == oid) || (oid == 0 && routines[i].Name == name) {
			matches = append(matches, &routines[i])
		}
	}

	switch len(matches) {
	case 0:
		return nil, fmt.Errorf("routine %q not found", name)
	case 1:
		return matches[0], nil
	default:
		return nil, fmt.Errorf("%q has several overloads; open the one you want from the tree", name)
	}
}
