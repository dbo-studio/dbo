package databaseMongo

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"go.mongodb.org/mongo-driver/v2/bson"
)

// Aggregate runs a pipeline and returns at most limit documents. checkJSON (inside argArray) refuses $out/$merge,
// $where, $function and $accumulator, so the preview never writes or runs server-side JavaScript.
func (r *Repository) Aggregate(ctx context.Context, containerID, pipeline string, limit int) (*contract.AggregateResult, error) {
	stages, err := argArray(pipeline)
	if err != nil {
		return nil, err
	}

	limit = contract.BrowseQuery{Limit: limit}.ClampLimit(50)

	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return nil, err
	}

	// One extra row only proves there is more.
	cur, err := coll.Aggregate(ctx, append(stages, bson.D{{Key: "$limit", Value: limit + 1}}))
	if err != nil {
		return nil, contract.Invalid("%v", err)
	}

	var docs []bson.D
	if err := cur.All(ctx, &docs); err != nil {
		return nil, contract.Invalid("%v", err)
	}

	out := &contract.AggregateResult{Docs: make([]string, 0, min(len(docs), limit))}

	for i, d := range docs {
		if i == limit {
			out.Truncated = true

			break
		}

		text, err := canonical(d)
		if err != nil {
			return nil, err
		}

		out.Docs = append(out.Docs, text)
	}

	return out, nil
}
