package databaseMongo

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var _ contract.ServerTools = (*Repository)(nil)

const (
	maxOperations = 100
	maxCommandLen = 300
	maxDatabases  = 100
	maxFiles      = 200
)

// namePattern is what a database or collection name this app creates may contain.
var namePattern = regexp.MustCompile(`^[A-Za-z0-9_][A-Za-z0-9_.-]{0,62}$`)

// adminCommand runs a command on the admin database and returns the reply as plain maps.
func (r *Repository) adminCommand(ctx context.Context, cmd bson.D) (map[string]any, error) {
	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	var res bson.D
	if err := c.Database("admin").RunCommand(ctx, cmd).Decode(&res); err != nil {
		return nil, err
	}

	return relaxed(res)
}

func num(v any) int64 {
	if f, ok := v.(float64); ok {
		return int64(f)
	}

	return 0
}

func sub(m map[string]any, key string) map[string]any {
	out, _ := m[key].(map[string]any)

	return out
}

func counts(m map[string]any, keys ...string) map[string]int64 {
	out := map[string]int64{}

	for _, k := range keys {
		if v, ok := m[k]; ok {
			out[k] = num(v)
		}
	}

	return out
}

func (r *Repository) Server(ctx context.Context) (*contract.ServerStatus, error) {
	m, err := r.adminCommand(ctx, bson.D{{Key: "serverStatus", Value: 1}})
	if err != nil {
		return nil, err
	}

	out := &contract.ServerStatus{
		UptimeSecs:  num(m["uptime"]),
		Connections: counts(sub(m, "connections"), "current", "available"),
		OpCounters:  counts(sub(m, "opcounters"), "insert", "query", "update", "delete", "getmore", "command"),
		MemoryMB:    counts(sub(m, "mem"), "resident", "virtual"),
	}
	out.Host, _ = m["host"].(string)
	out.Version, _ = m["version"].(string)

	if repl := sub(m, "repl"); repl != nil {
		out.Replica, _ = repl["setName"].(string)
	}

	return out, nil
}

func (r *Repository) Operations(ctx context.Context) ([]contract.OperationInfo, error) {
	m, err := r.adminCommand(ctx, bson.D{{Key: "currentOp", Value: 1}})
	if err != nil {
		return nil, err
	}

	list, _ := m["inprog"].([]any)
	out := make([]contract.OperationInfo, 0, len(list))

	for _, item := range list {
		op, _ := item.(map[string]any)

		// The listing itself shows up as an operation; it is noise.
		if kind, _ := op["op"].(string); kind == "command" && sub(op, "command") != nil && sub(op, "command")["currentOp"] != nil {
			continue
		}

		info := contract.OperationInfo{ID: fmt.Sprint(op["opid"]), Secs: num(op["secs_running"])}
		info.Namespace, _ = op["ns"].(string)
		info.Op, _ = op["op"].(string)
		info.Client, _ = op["client"].(string)
		info.Active, _ = op["active"].(bool)

		if cmd := sub(op, "command"); cmd != nil {
			b, _ := json.Marshal(cmd)
			text := string(b)

			if len(text) > maxCommandLen {
				text = text[:maxCommandLen] + "…"
			}

			info.Command = text
		}

		out = append(out, info)
	}

	sort.SliceStable(out, func(i, j int) bool { return out[i].Secs > out[j].Secs })

	if len(out) > maxOperations {
		out = out[:maxOperations]
	}

	return out, nil
}

func (r *Repository) KillOperation(ctx context.Context, id string) error {
	n, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return contract.Invalid("an operation id is a number")
	}

	_, err = r.adminCommand(ctx, bson.D{{Key: "killOp", Value: 1}, {Key: "op", Value: n}})

	return err
}

func (r *Repository) Databases(ctx context.Context) ([]contract.DatabaseInfo, error) {
	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	res, err := c.ListDatabases(ctx, bson.D{})
	if err != nil {
		return nil, err
	}

	out := make([]contract.DatabaseInfo, 0, len(res.Databases))

	for i, d := range res.Databases {
		if i >= maxDatabases {
			break
		}

		info := contract.DatabaseInfo{Name: d.Name, SizeOnDisk: d.SizeOnDisk}
		if names, err := c.Database(d.Name).ListCollectionNames(ctx, bson.D{}); err == nil {
			info.Collections = len(names)
		}

		out = append(out, info)
	}

	return out, nil
}

func checkName(kind, name string) error {
	if !namePattern.MatchString(name) || strings.HasPrefix(name, "system.") {
		return contract.Invalid("%s names use letters, digits, _ . - and start with a letter, digit or _", kind)
	}

	return nil
}

func (r *Repository) CreateDatabase(ctx context.Context, name, firstCollection string) error {
	if err := checkName("database", name); err != nil {
		return err
	}

	if strings.Contains(name, ".") {
		return contract.Invalid("a database name cannot contain a dot")
	}

	if err := checkName("collection", firstCollection); err != nil {
		return err
	}

	c, err := r.client()
	if err != nil {
		return err
	}
	defer r.release(ctx, c)

	// MongoDB creates a database with its first collection; there is no empty database.
	return c.Database(name).CreateCollection(ctx, firstCollection)
}

func (r *Repository) DropDatabase(ctx context.Context, name string) error {
	if name == "admin" || name == "local" || name == "config" || checkName("database", name) != nil {
		return contract.Invalid("this database cannot be dropped")
	}

	c, err := r.client()
	if err != nil {
		return err
	}
	defer r.release(ctx, c)

	return c.Database(name).Drop(ctx)
}

func (r *Repository) Collections(ctx context.Context, db string) ([]contract.CollectionInfo, error) {
	if err := checkName("database", db); err != nil {
		return nil, err
	}

	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	specs, err := c.Database(db).ListCollectionSpecifications(ctx, bson.D{})
	if err != nil {
		return nil, err
	}

	out := make([]contract.CollectionInfo, 0, len(specs))

	for _, s := range specs {
		if strings.HasPrefix(s.Name, "system.") {
			continue
		}

		info := contract.CollectionInfo{Name: s.Name, Type: s.Type}
		if info.Type == "" {
			info.Type = "collection"
		}

		if opts, err := relaxed(s.Options); err == nil {
			info.Capped, _ = opts["capped"].(bool)
		}

		out = append(out, info)
	}

	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })

	return out, nil
}

func (r *Repository) CreateCollectionWith(ctx context.Context, db, name string, o contract.CollectionOptions) error {
	if err := checkName("database", db); err != nil {
		return err
	}

	if err := checkName("collection", name); err != nil {
		return err
	}

	c, err := r.client()
	if err != nil {
		return err
	}
	defer r.release(ctx, c)

	d := c.Database(db)

	switch o.Kind {
	case "", "collection":
		return d.CreateCollection(ctx, name)
	case "capped":
		if o.CappedBytes < 4096 {
			return contract.Invalid("a capped collection needs a size of at least 4096 bytes")
		}

		return d.CreateCollection(ctx, name, options.CreateCollection().SetCapped(true).SetSizeInBytes(o.CappedBytes))
	case "timeseries":
		if o.TimeField == "" {
			return contract.Invalid("a time series collection needs a time field")
		}

		ts := options.TimeSeries().SetTimeField(o.TimeField)
		if o.MetaField != "" {
			ts.SetMetaField(o.MetaField)
		}

		switch o.Granularity {
		case "":
		case "seconds", "minutes", "hours":
			ts.SetGranularity(o.Granularity)
		default:
			return contract.Invalid("granularity is seconds, minutes or hours")
		}

		return d.CreateCollection(ctx, name, options.CreateCollection().SetTimeSeriesOptions(ts))
	case "view":
		if err := checkName("source collection", o.ViewOn); err != nil {
			return err
		}

		pipeline := bson.A{}
		if strings.TrimSpace(o.Pipeline) != "" {
			if pipeline, err = argArray(o.Pipeline); err != nil {
				return err
			}
		}

		return d.CreateView(ctx, name, o.ViewOn, pipeline)
	}

	return contract.Invalid("kind is collection, capped, timeseries or view")
}

func (r *Repository) Users(ctx context.Context) ([]contract.UserInfo, error) {
	m, err := r.adminCommand(ctx, bson.D{{Key: "usersInfo", Value: bson.D{{Key: "forAllDBs", Value: true}}}})
	if err != nil {
		return nil, err
	}

	list, _ := m["users"].([]any)
	out := make([]contract.UserInfo, 0, len(list))

	for _, item := range list {
		u, _ := item.(map[string]any)
		info := contract.UserInfo{}
		info.User, _ = u["user"].(string)
		info.DB, _ = u["db"].(string)

		roles, _ := u["roles"].([]any)
		for _, role := range roles {
			rm, _ := role.(map[string]any)
			name, _ := rm["role"].(string)
			db, _ := rm["db"].(string)
			info.Roles = append(info.Roles, name+"@"+db)
		}

		out = append(out, info)
	}

	sort.Slice(out, func(i, j int) bool { return out[i].DB+"."+out[i].User < out[j].DB+"."+out[j].User })

	return out, nil
}

// ---- GridFS ---------------------------------------------------------------------------------------------------

func (r *Repository) GridFSBuckets(ctx context.Context, db string) ([]string, error) {
	cols, err := r.Collections(ctx, db)
	if err != nil {
		return nil, err
	}

	var out []string

	for _, c := range cols {
		if name, ok := strings.CutSuffix(c.Name, ".files"); ok {
			out = append(out, name)
		}
	}

	return out, nil
}

func (r *Repository) bucket(c *mongo.Client, db, name string) (*mongo.GridFSBucket, error) {
	if err := checkName("database", db); err != nil {
		return nil, err
	}

	if err := checkName("bucket", name); err != nil {
		return nil, err
	}

	return c.Database(db).GridFSBucket(options.GridFSBucket().SetName(name)), nil
}

func (r *Repository) GridFSFiles(ctx context.Context, db, bucket string, limit int) ([]contract.GridFSFile, error) {
	if err := checkName("bucket", bucket); err != nil {
		return nil, err
	}

	if limit <= 0 || limit > maxFiles {
		limit = maxFiles
	}

	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	if err := checkName("database", db); err != nil {
		return nil, err
	}

	cur, err := c.Database(db).Collection(bucket+".files").Find(ctx, bson.D{}, options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "uploadDate", Value: -1}}))
	if err != nil {
		return nil, err
	}

	var docs []bson.D
	if err := cur.All(ctx, &docs); err != nil {
		return nil, err
	}

	out := make([]contract.GridFSFile, 0, len(docs))

	for _, d := range docs {
		m, err := relaxed(d)
		if err != nil {
			continue
		}

		id, _ := docID(d)
		f := contract.GridFSFile{ID: idString(id), Length: num(m["length"])}
		f.Filename, _ = m["filename"].(string)

		if u, ok := m["uploadDate"].(map[string]any); ok {
			f.UploadDate = fmt.Sprint(u["$date"])
		}

		if meta := sub(m, "metadata"); meta != nil {
			f.ContentType, _ = meta["contentType"].(string)
		}

		if f.ContentType == "" {
			f.ContentType, _ = m["contentType"].(string)
		}

		out = append(out, f)
	}

	return out, nil
}

// gridFSStream closes the client when the download is closed.
type gridFSStream struct {
	*mongo.GridFSDownloadStream
	release func()
}

func (g gridFSStream) Close() error {
	err := g.GridFSDownloadStream.Close()
	g.release()

	return err
}

func (r *Repository) GridFSOpen(ctx context.Context, db, bucket, id string) (io.ReadCloser, *contract.GridFSFile, error) {
	c, err := r.client()
	if err != nil {
		return nil, nil, err
	}

	release := func() { r.release(ctx, c) }

	b, err := r.bucket(c, db, bucket)
	if err != nil {
		release()

		return nil, nil, err
	}

	stream, err := b.OpenDownloadStream(ctx, parseID(id))
	if err != nil {
		release()

		return nil, nil, contract.Invalid("file %q does not exist", id)
	}

	file := stream.GetFile()
	meta := &contract.GridFSFile{ID: id, Filename: file.Name, Length: file.Length}

	return gridFSStream{stream, release}, meta, nil
}

func (r *Repository) GridFSDelete(ctx context.Context, db, bucket, id string) error {
	c, err := r.client()
	if err != nil {
		return err
	}
	defer r.release(ctx, c)

	b, err := r.bucket(c, db, bucket)
	if err != nil {
		return err
	}

	if err := b.Delete(ctx, parseID(id)); err != nil {
		return contract.Invalid("file %q does not exist", id)
	}

	return nil
}

// ---- change stream -----------------------------------------------------------------------------------------------

func (r *Repository) WatchChanges(ctx context.Context, containerID string, emit func(contract.ChangeEvent) error) error {
	c, err := r.client()
	if err != nil {
		return err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return err
	}

	cs, err := coll.Watch(ctx, mongo.Pipeline{}, options.ChangeStream().SetFullDocument(options.UpdateLookup))
	if err != nil {
		if strings.Contains(err.Error(), "replica set") || strings.Contains(err.Error(), "only supported on replica sets") {
			return contract.Invalid("change streams need a replica set or a sharded cluster; this server is a standalone")
		}

		return err
	}
	defer cs.Close(context.WithoutCancel(ctx))

	for cs.Next(ctx) {
		var ev bson.D
		if err := cs.Decode(&ev); err != nil {
			return err
		}

		m, err := relaxed(ev)
		if err != nil {
			continue
		}

		out := contract.ChangeEvent{At: time.Now().UTC().Format(time.RFC3339Nano)}
		out.Op, _ = m["operationType"].(string)

		if k := sub(m, "documentKey"); k != nil {
			b, _ := json.Marshal(k["_id"])
			out.Key = string(b)
		}

		if doc := sub(m, "fullDocument"); doc != nil {
			b, _ := json.Marshal(doc)
			out.Doc = string(b)
		}

		if err := emit(out); err != nil {
			return err
		}
	}

	if ctx.Err() != nil {
		return nil
	}

	return cs.Err()
}
