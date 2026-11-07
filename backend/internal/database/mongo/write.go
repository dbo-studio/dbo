package databaseMongo

import (
	"context"
	"errors"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// maxDeleteBatch matches contract.MaxBrowseLimit: callers never delete an unbounded set in one call.
const maxDeleteBatch = contract.MaxBrowseLimit

func docText(v any) (string, error) {
	s, ok := v.(string)
	if !ok {
		return "", contract.Invalid("a document must be JSON text")
	}

	return s, nil
}

// Save replaces one document. The _id cannot change: that would be a different document.
func (r *Repository) Save(ctx context.Context, containerID, itemID string, change contract.ItemChange) error {
	if change.Value == nil {
		return contract.Invalid("only the document can be changed")
	}

	text, err := docText(change.Value)
	if err != nil {
		return err
	}

	doc, err := parseDoc(text)
	if err != nil {
		return err
	}

	want := parseID(itemID)

	if got, ok := docID(doc); !ok {
		doc = append(bson.D{{Key: "_id", Value: want}}, doc...)
	} else if idString(got) != itemID {
		return contract.Invalid("_id cannot be changed")
	}

	c, err := r.client()
	if err != nil {
		return err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return err
	}

	res, err := coll.ReplaceOne(ctx, bson.D{{Key: "_id", Value: want}}, doc)
	if err != nil {
		return err
	}

	if res.MatchedCount == 0 {
		return contract.Invalid("document %q does not exist", itemID)
	}

	return nil
}

func (r *Repository) Insert(ctx context.Context, containerID string, in contract.ItemInput) (string, error) {
	text := "{}"

	if in.Value != nil {
		t, err := docText(in.Value)
		if err != nil {
			return "", err
		}

		text = t
	}

	doc, err := parseDoc(text)
	if err != nil {
		return "", err
	}

	if _, ok := docID(doc); !ok && in.ID != "" {
		doc = append(bson.D{{Key: "_id", Value: parseID(in.ID)}}, doc...)
	}

	c, err := r.client()
	if err != nil {
		return "", err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return "", err
	}

	res, err := coll.InsertOne(ctx, doc)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return "", contract.Invalid("a document with this _id already exists")
		}

		return "", err
	}

	return idString(res.InsertedID), nil
}

// Delete removes documents by _id. Batches are bounded.
func (r *Repository) Delete(ctx context.Context, containerID string, itemIDs []string) error {
	if len(itemIDs) > maxDeleteBatch {
		return contract.Invalid("at most %d documents per delete", maxDeleteBatch)
	}

	c, err := r.client()
	if err != nil {
		return err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return err
	}

	return deleteIDs(ctx, coll, itemIDs)
}

func deleteIDs(ctx context.Context, coll *mongo.Collection, itemIDs []string) error {
	ids := make(bson.A, 0, len(itemIDs))
	for _, id := range itemIDs {
		ids = append(ids, parseID(id))
	}

	if len(ids) == 0 {
		return errors.New("no ids")
	}

	_, err := coll.DeleteMany(ctx, bson.D{{Key: "_id", Value: bson.D{{Key: "$in", Value: ids}}}})

	return err
}
