package databaseMongo

import (
	"context"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func extJSON(v any) string {
	b, _ := bson.MarshalExtJSON(v, false, false)

	return string(b)
}

func (r *Repository) Indexes(ctx context.Context, containerID string) ([]contract.IndexDetail, error) {
	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return nil, err
	}

	cur, err := coll.Indexes().List(ctx)
	if err != nil {
		return nil, err
	}

	var specs []bson.D
	if err := cur.All(ctx, &specs); err != nil {
		return nil, err
	}

	// $indexStats needs extra privileges on some deployments; usage just stays unknown then.
	ops := map[string]int64{}

	if sc, err := coll.Aggregate(ctx, bson.A{bson.D{{Key: "$indexStats", Value: bson.D{}}}}); err == nil {
		var rows []bson.M
		if sc.All(ctx, &rows) == nil {
			for _, row := range rows {
				name, _ := row["name"].(string)
				// A nested document decodes as bson.M or bson.D depending on the driver's defaults.
				switch acc := row["accesses"].(type) {
				case bson.M:
					ops[name] = int64Of(acc["ops"])
				case bson.D:
					ops[name] = int64Of(get(acc, "ops"))
				}
			}
		}
	}

	out := make([]contract.IndexDetail, 0, len(specs))

	for _, spec := range specs {
		d := contract.IndexDetail{Ops: -1}

		for _, e := range spec {
			switch e.Key {
			case "name":
				d.Name, _ = e.Value.(string)
			case "key":
				d.Keys = extJSON(e.Value)
			case "unique":
				d.Unique, _ = e.Value.(bool)
			case "sparse":
				d.Sparse, _ = e.Value.(bool)
			case "expireAfterSeconds":
				n := int32(int64Of(e.Value))
				d.TTLSecs = &n
			case "partialFilterExpression":
				d.Partial = extJSON(e.Value)
			}
		}

		if n, ok := ops[d.Name]; ok {
			d.Ops = n
		}

		out = append(out, d)
	}

	return out, nil
}

func (r *Repository) CreateIndex(ctx context.Context, containerID string, spec contract.IndexSpec) (string, error) {
	keys, err := parseDoc(spec.Keys)
	if err != nil {
		return "", err
	}

	if len(keys) == 0 {
		return "", contract.Invalid("an index needs at least one key")
	}

	opts := options.Index().SetUnique(spec.Unique).SetSparse(spec.Sparse)

	if spec.Name != "" {
		opts.SetName(spec.Name)
	}

	if spec.TTLSecs != nil {
		if *spec.TTLSecs < 0 {
			return "", contract.Invalid("TTL must not be negative")
		}

		opts.SetExpireAfterSeconds(*spec.TTLSecs)
	}

	if strings.TrimSpace(spec.Partial) != "" {
		p, err := parseDoc(spec.Partial)
		if err != nil {
			return "", err
		}

		opts.SetPartialFilterExpression(p)
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

	return coll.Indexes().CreateOne(ctx, mongo.IndexModel{Keys: keys, Options: opts})
}

func (r *Repository) DropIndex(ctx context.Context, containerID, name string) error {
	if name == "" || name == "_id_" {
		return contract.Invalid("the _id index cannot be dropped")
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

	return coll.Indexes().DropOne(ctx, name)
}

// Explain runs the browse query through the server's explain with executionStats. It reads no documents to the client.
func (r *Repository) Explain(ctx context.Context, containerID string, q contract.BrowseQuery) (*contract.ExplainResult, error) {
	db, collName, err := splitContainer(containerID)
	if err != nil {
		return nil, err
	}

	filter, err := parseDoc(q.Filter)
	if err != nil {
		return nil, err
	}

	sort, err := sortDoc(q.Sorts)
	if err != nil {
		return nil, err
	}

	find := bson.D{{Key: "find", Value: collName}, {Key: "filter", Value: filter}}
	if sort != nil {
		find = append(find, bson.E{Key: "sort", Value: sort})
	}

	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	var res bson.D
	if err := c.Database(db).RunCommand(ctx, bson.D{{Key: "explain", Value: find}, {Key: "verbosity", Value: "executionStats"}}).Decode(&res); err != nil {
		return nil, err
	}

	out := &contract.ExplainResult{Raw: extJSON(res)}

	if es, ok := get(res, "executionStats").(bson.D); ok {
		out.Returned = int64Of(get(es, "nReturned"))
		out.DocsExamined = int64Of(get(es, "totalDocsExamined"))
		out.KeysExamined = int64Of(get(es, "totalKeysExamined"))
		out.Millis = int64Of(get(es, "executionTimeMillis"))
	}

	if qp, ok := get(res, "queryPlanner").(bson.D); ok {
		if wp, ok := get(qp, "winningPlan").(bson.D); ok {
			out.Stage, out.Index = planSummary(wp)
		}
	}

	return out, nil
}

func get(d bson.D, key string) any {
	for _, e := range d {
		if e.Key == key {
			return e.Value
		}
	}

	return nil
}

// planSummary walks the winning plan down its input stages: the root stage and the first index it scans.
func planSummary(plan bson.D) (stage, index string) {
	stage, _ = get(plan, "stage").(string)

	for cur := plan; cur != nil; {
		if idx, ok := get(cur, "indexName").(string); ok {
			index = idx

			break
		}

		next, _ := get(cur, "inputStage").(bson.D)
		cur = next
	}

	return stage, index
}
