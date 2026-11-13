package databaseMongo

import (
	"context"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const importBatch = 1000

type exportIter struct {
	cur     *mongo.Cursor
	release func()
}

func (e *exportIter) Next(ctx context.Context) (string, bool, error) {
	if !e.cur.Next(ctx) {
		return "", false, e.cur.Err()
	}

	var d bson.D
	if err := e.cur.Decode(&d); err != nil {
		return "", false, err
	}

	// Canonical Extended JSON keeps every BSON type exact, so an export can be imported back unchanged.
	b, err := bson.MarshalExtJSON(d, true, false)

	return string(b), err == nil, err
}

func (e *exportIter) Close(ctx context.Context) {
	_ = e.cur.Close(ctx)
	e.release()
}

func (r *Repository) Export(ctx context.Context, containerID, filter string) (contract.ExportIter, error) {
	f, err := parseDoc(filter)
	if err != nil {
		return nil, err
	}

	c, err := r.client()
	if err != nil {
		return nil, err
	}

	release := func() { r.release(ctx, c) }

	coll, err := r.collection(c, containerID)
	if err != nil {
		release()

		return nil, err
	}

	cur, err := coll.Find(ctx, f, options.Find().SetSort(bson.D{{Key: "_id", Value: 1}}))
	if err != nil {
		release()

		return nil, err
	}

	return &exportIter{cur: cur, release: release}, nil
}

// parseImport reads NDJSON (one document per line) or a JSON array of documents.
func parseImport(data, format string) ([]bson.D, error) {
	if len(data) > contract.MaxImportBytes {
		return nil, contract.Invalid("input is larger than %d MiB", contract.MaxImportBytes>>20)
	}

	if err := checkJSON(data); err != nil {
		return nil, err
	}

	switch format {
	case "json":
		arr, err := argArray(data)
		if err != nil {
			return nil, err
		}

		docs := make([]bson.D, 0, len(arr))

		for i, v := range arr {
			d, ok := v.(bson.D)
			if !ok {
				return nil, contract.Invalid("item %d is not a document", i+1)
			}

			docs = append(docs, d)
		}

		return docs, nil
	case "ndjson":
		var docs []bson.D

		for i, line := range strings.Split(data, "\n") {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}

			var d bson.D
			if err := bson.UnmarshalExtJSON([]byte(line), false, &d); err != nil {
				return nil, contract.Invalid("line %d is not a JSON document: %v", i+1, err)
			}

			docs = append(docs, d)
		}

		return docs, nil
	default:
		return nil, contract.Invalid("format must be ndjson or json")
	}
}

// ImportDocs inserts documents given as Extended JSON text, in order.
func (r *Repository) ImportDocs(ctx context.Context, containerID string, texts []string) (int, error) {
	docs := make([]bson.D, 0, len(texts))

	for i, t := range texts {
		d, err := parseDoc(t)
		if err != nil {
			return 0, contract.Invalid("document %d: %v", i+1, err)
		}

		docs = append(docs, d)
	}

	return r.insertDocs(ctx, containerID, docs)
}

func (r *Repository) Import(ctx context.Context, containerID, data, format string) (int, error) {
	// Parsing everything first means a malformed file writes nothing.
	docs, err := parseImport(data, format)
	if err != nil {
		return 0, err
	}

	return r.insertDocs(ctx, containerID, docs)
}

// insertDocs writes documents in batches and stops at the first failure; inserted is what was written before it.
func (r *Repository) insertDocs(ctx context.Context, containerID string, docs []bson.D) (int, error) {
	c, err := r.client()
	if err != nil {
		return 0, err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return 0, err
	}

	inserted := 0

	for start := 0; start < len(docs); start += importBatch {
		batch := docs[start:min(start+importBatch, len(docs))]

		many := make([]any, len(batch))
		for i, d := range batch {
			many[i] = d
		}

		res, err := coll.InsertMany(ctx, many)
		if res != nil {
			inserted += len(res.InsertedIDs)
		}

		if err != nil {
			return inserted, contract.Invalid("stopped after %d documents: %v", inserted, err)
		}
	}

	return inserted, nil
}

func (r *Repository) RenameCollection(ctx context.Context, containerID, newName string) (string, error) {
	db, old, err := splitContainer(containerID)
	if err != nil {
		return "", err
	}

	newName = strings.TrimSpace(newName)
	if newName == "" || strings.HasPrefix(newName, "system.") || strings.ContainsAny(newName, "$\x00") {
		return "", contract.Invalid("invalid collection name")
	}

	if newName == old {
		return containerID, nil
	}

	c, err := r.client()
	if err != nil {
		return "", err
	}
	defer r.release(ctx, c)

	// dropTarget is left false so a rename never overwrites another collection.
	cmd := bson.D{{Key: "renameCollection", Value: db + "." + old}, {Key: "to", Value: db + "." + newName}}
	if err := c.Database("admin").RunCommand(ctx, cmd).Err(); err != nil {
		return "", contract.Invalid("%v", err)
	}

	return db + "/" + newName, nil
}

func (r *Repository) DropCollection(ctx context.Context, containerID string) error {
	c, err := r.client()
	if err != nil {
		return err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return err
	}

	return coll.Drop(ctx)
}
