package databaseMongo

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

var _ contract.ObjectFormProvider = (*Repository)(nil)

var (
	kindOptions = []contract.FormFieldOption{
		{Value: "collection", Label: "Collection"},
		{Value: "capped", Label: "Capped"},
		{Value: "timeseries", Label: "Time series"},
		{Value: "view", Label: "View"},
	}
	granularityOptions = []contract.FormFieldOption{
		{Value: "seconds", Label: "Seconds"},
		{Value: "minutes", Label: "Minutes"},
		{Value: "hours", Label: "Hours"},
	}
	levelOptions = []contract.FormFieldOption{
		{Value: "off", Label: "Off"},
		{Value: "moderate", Label: "Moderate"},
		{Value: "strict", Label: "Strict"},
	}
	validationActionOptions = []contract.FormFieldOption{
		{Value: "error", Label: "Error"},
		{Value: "warn", Label: "Warn"},
	}
)

const userNodePrefix = "usr:"

func field(id, name string, typ contract.TreeFormFieldTypeEnum, required bool) contract.FormField {
	return contract.FormField{ID: id, Name: name, Type: typ, Required: required}
}

func text(id, name string, required bool) contract.FormField {
	return field(id, name, contract.FormFieldTypeText, required)
}

func selectField(id, name string, options []contract.FormFieldOption, value string) contract.FormField {
	f := field(id, name, contract.FormFieldTypeSelect, false)
	f.Options, f.Value = options, value

	return f
}

func createDatabaseFields() []contract.FormField {
	return []contract.FormField{text("name", "Database", true), text("collection", "First collection", true)}
}

func createCollectionFields() []contract.FormField {
	return []contract.FormField{
		text("name", "Name", true),
		selectField("kind", "Kind", kindOptions, "collection"),
		text("cappedBytes", "Capped size in bytes (capped only)", false),
		text("timeField", "Time field (time series only)", false),
		text("metaField", "Meta field (time series only)", false),
		selectField("granularity", "Granularity (time series only)", granularityOptions, "seconds"),
		text("viewOn", "View on collection (view only)", false),
		text("pipeline", "Pipeline, a JSON array (view only)", false),
	}
}

func indexFields() []contract.FormField {
	return []contract.FormField{
		text("name", "Name", false),
		text("keys", `Keys, like {"email": 1}`, true),
		field("unique", "Unique", contract.FormFieldTypeCheckBox, false),
		field("sparse", "Sparse", contract.FormFieldTypeCheckBox, false),
		text("ttlSecs", "Expire after seconds", false),
		text("partial", "Partial filter", false),
	}
}

func validationFields() []contract.FormField {
	return []contract.FormField{
		text("validator", `Rule, a JSON document like {"$jsonSchema": {...}}`, false),
		selectField("level", "Level", levelOptions, "strict"),
		selectField("action", "Action", validationActionOptions, "error"),
	}
}

func userFields(create bool) []contract.FormField {
	fields := []contract.FormField{
		text("password", "Password"+map[bool]string{true: "", false: " (leave empty to keep it)"}[create], create),
		text("roles", "Roles, like readWrite@shop, read@test", false),
	}
	fields[0].Type = contract.FormFieldTypePassword

	if create {
		return append([]contract.FormField{text("name", "User", true), text("db", "Authentication database", true)}, fields...)
	}

	return append([]contract.FormField{text("name", "User", false), text("db", "Authentication database", false)}, fields...)
}

func (r *Repository) GetFormTabs(_ context.Context, action contract.TreeNodeActionName) []contract.FormTab {
	switch action {
	case contract.CreateDatabaseAction, contract.EditDatabaseAction:
		return []contract.FormTab{{ID: contract.DatabaseTab, Name: "Database"}}
	case contract.CreateCollectionAction:
		return []contract.FormTab{{ID: contract.CollectionTab, Name: "Collection"}}
	case contract.EditCollectionAction:
		return []contract.FormTab{
			{ID: contract.CollectionTab, Name: "General"},
			{ID: contract.CollectionIndexesTab, Name: "Indexes"},
			{ID: contract.CollectionValidationTab, Name: "Validation"},
		}
	case contract.CreateUserAction, contract.EditUserAction:
		return []contract.FormTab{{ID: contract.UserTab, Name: "User"}}
	default:
		return []contract.FormTab{}
	}
}

func fill(fields []contract.FormField, values map[string]any) *contract.FormResponse {
	general := make([]contract.GeneralField, 0, len(fields))

	for _, f := range fields {
		v, ok := values[f.ID]
		if !ok {
			v = f.Value
		}

		general = append(general, contract.GeneralField{ID: f.ID, Name: f.Name, Type: f.Type, Required: f.Required, Value: v, Options: f.Options})
	}

	return &contract.FormResponse{General: general, Schema: []contract.FormField{}, Data: []map[string]any{}}
}

// collectionNode reads "db/collection", the id the tree gives a collection.
func collectionNode(nodeID string) (db, coll, container string) {
	db, coll, _ = strings.Cut(nodeID, "/")

	return db, coll, db + "/" + coll
}

// userNode reads "usr:db:name".
func userNode(nodeID string) (db, name string, err error) {
	parts := strings.SplitN(strings.TrimPrefix(nodeID, userNodePrefix), ":", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", contract.Invalid("this user is not valid")
	}

	return parts[0], parts[1], nil
}

func (r *Repository) Objects(ctx context.Context, nodeID string, tabID contract.TreeTab, action contract.TreeNodeActionName) (*contract.FormResponse, error) {
	switch {
	case tabID == contract.DatabaseTab && action == contract.CreateDatabaseAction:
		return fill(createDatabaseFields(), nil), nil
	case tabID == contract.DatabaseTab:
		return r.databaseInfoForm(ctx, nodeID)
	case tabID == contract.CollectionTab && action == contract.CreateCollectionAction:
		return fill(createCollectionFields(), nil), nil
	case tabID == contract.CollectionTab:
		return r.collectionInfoForm(ctx, nodeID)
	case tabID == contract.CollectionIndexesTab:
		return r.indexesForm(ctx, nodeID)
	case tabID == contract.CollectionValidationTab:
		_, _, container := collectionNode(nodeID)

		v, err := r.GetValidator(ctx, container)
		if err != nil {
			return nil, err
		}

		return fill(validationFields(), map[string]any{"validator": v.Validator, "level": orDefault(v.Level, "strict"), "action": orDefault(v.Action, "error")}), nil
	case tabID == contract.UserTab && action == contract.CreateUserAction:
		return fill(userFields(true), map[string]any{"db": "admin"}), nil
	case tabID == contract.UserTab:
		return r.userForm(ctx, nodeID)
	}

	return nil, fmt.Errorf("MongoDB: unsupported tab: %s", tabID)
}

func (r *Repository) databaseInfoForm(ctx context.Context, name string) (*contract.FormResponse, error) {
	dbs, err := r.Databases(ctx)
	if err != nil {
		return nil, err
	}

	values := map[string]any{"name": name}

	for _, d := range dbs {
		if d.Name == name {
			values["sizeOnDisk"], values["collections"] = strconv.FormatInt(d.SizeOnDisk, 10), strconv.Itoa(d.Collections)
		}
	}

	return fill([]contract.FormField{text("name", "Database", true), text("sizeOnDisk", "Size on disk (bytes)", false), text("collections", "Collections", false)}, values), nil
}

func (r *Repository) collectionInfoForm(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	db, coll, _ := collectionNode(nodeID)

	infos, err := r.Collections(ctx, db)
	if err != nil {
		return nil, err
	}

	values := map[string]any{"name": coll, "kind": "collection"}

	for _, c := range infos {
		if c.Name != coll {
			continue
		}

		if c.Capped {
			values["kind"] = "capped"
		} else if c.Type != "" {
			values["kind"] = c.Type
		}
	}

	return fill([]contract.FormField{text("name", "Name", true), selectField("kind", "Kind (cannot be changed)", kindOptions, "collection")}, values), nil
}

func (r *Repository) indexesForm(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	_, _, container := collectionNode(nodeID)

	list, err := r.Indexes(ctx, container)
	if err != nil {
		return nil, err
	}

	rows := make([]map[string]any, 0, len(list))

	for _, ix := range list {
		ttl := ""
		if ix.TTLSecs != nil {
			ttl = strconv.Itoa(int(*ix.TTLSecs))
		}

		rows = append(rows, map[string]any{"name": ix.Name, "keys": ix.Keys, "unique": ix.Unique, "sparse": ix.Sparse, "ttlSecs": ttl, "partial": ix.Partial})
	}

	return &contract.FormResponse{General: []contract.GeneralField{}, Schema: indexFields(), Data: rows}, nil
}

func (r *Repository) userForm(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	db, name, err := userNode(nodeID)
	if err != nil {
		return nil, err
	}

	users, err := r.Users(ctx)
	if err != nil {
		return nil, err
	}

	values := map[string]any{"name": name, "db": db}

	for _, u := range users {
		if u.DB == db && u.User == name {
			values["roles"] = strings.Join(u.Roles, ", ")
		}
	}

	return fill(userFields(false), values), nil
}

// ---- Execute ---------------------------------------------------------------------------------------------

type tabPayload struct {
	New     map[string]any `json:"new"`
	Old     map[string]any `json:"old"`
	Columns []struct {
		New     map[string]any `json:"new"`
		Old     map[string]any `json:"old"`
		Added   bool           `json:"added"`
		Deleted bool           `json:"deleted"`
	} `json:"columns"`
}

func parsePayload(params []byte) (map[contract.TreeTab]tabPayload, error) {
	var payload map[contract.TreeTab]tabPayload

	if err := json.Unmarshal(params, &payload); err != nil {
		return nil, contract.Invalid("the form data is not valid")
	}

	return payload, nil
}

func str(m map[string]any, key string) string {
	v, ok := m[key]
	if !ok || v == nil {
		return ""
	}

	return strings.TrimSpace(fmt.Sprint(v))
}

func flag(m map[string]any, key string) bool {
	b, _ := m[key].(bool)

	return b
}

// step is one change: the statement the preview shows and the call that makes it.
type step struct {
	preview string
	run     func(ctx context.Context) error
}

func collectionOptionsFrom(m map[string]any) (contract.CollectionOptions, error) {
	o := contract.CollectionOptions{Kind: str(m, "kind"), TimeField: str(m, "timeField"), MetaField: str(m, "metaField"), Granularity: str(m, "granularity"), ViewOn: str(m, "viewOn"), Pipeline: str(m, "pipeline")}

	if raw := str(m, "cappedBytes"); raw != "" {
		n, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			return o, contract.Invalid("the capped size is a number of bytes")
		}

		o.CappedBytes = n
	}

	return o, nil
}

// shellCreateCollection is the statement the preview shows for a new collection.
func shellCreateCollection(name string, o contract.CollectionOptions) string {
	q := strconv.Quote(name)

	switch o.Kind {
	case "capped":
		return fmt.Sprintf("db.createCollection(%s, { capped: true, size: %d })", q, o.CappedBytes)
	case "timeseries":
		ts := "timeField: " + strconv.Quote(o.TimeField)
		if o.MetaField != "" {
			ts += ", metaField: " + strconv.Quote(o.MetaField)
		}

		if o.Granularity != "" {
			ts += ", granularity: " + strconv.Quote(o.Granularity)
		}

		return fmt.Sprintf("db.createCollection(%s, { timeseries: { %s } })", q, ts)
	case "view":
		pipeline := o.Pipeline
		if pipeline == "" {
			pipeline = "[]"
		}

		return fmt.Sprintf("db.createView(%s, %s, %s)", q, strconv.Quote(o.ViewOn), pipeline)
	}

	return fmt.Sprintf("db.createCollection(%s)", q)
}

func indexSpecFrom(m map[string]any) (contract.IndexSpec, error) {
	spec := contract.IndexSpec{Keys: str(m, "keys"), Name: str(m, "name"), Unique: flag(m, "unique"), Sparse: flag(m, "sparse"), Partial: str(m, "partial")}

	if raw := str(m, "ttlSecs"); raw != "" {
		n, err := strconv.ParseInt(raw, 10, 32)
		if err != nil || n < 0 {
			return spec, contract.Invalid("the expiry is a number of seconds")
		}

		ttl := int32(n)
		spec.TTLSecs = &ttl
	}

	return spec, nil
}

func shellCreateIndex(coll string, s contract.IndexSpec) string {
	opts := []string{}
	if s.Name != "" {
		opts = append(opts, "name: "+strconv.Quote(s.Name))
	}

	if s.Unique {
		opts = append(opts, "unique: true")
	}

	if s.Sparse {
		opts = append(opts, "sparse: true")
	}

	if s.TTLSecs != nil {
		opts = append(opts, fmt.Sprintf("expireAfterSeconds: %d", *s.TTLSecs))
	}

	if s.Partial != "" {
		opts = append(opts, "partialFilterExpression: "+s.Partial)
	}

	return fmt.Sprintf("db.getCollection(%s).createIndex(%s, { %s })", strconv.Quote(coll), s.Keys, strings.Join(opts, ", "))
}

// plan turns a form payload into the steps that apply it, and the node the form moves to afterwards.
func (r *Repository) plan(nodeID string, action contract.TreeNodeActionName, params []byte) ([]step, *contract.ExecuteResult, error) {
	var payload map[contract.TreeTab]tabPayload

	if action != contract.DropDatabaseAction && action != contract.DropUserAction {
		var err error
		if payload, err = parsePayload(params); err != nil {
			return nil, nil, err
		}
	}

	switch action {
	case contract.CreateDatabaseAction:
		v := payload[contract.DatabaseTab].New
		name, first := str(v, "name"), str(v, "collection")

		return []step{{
			fmt.Sprintf("use %s;\ndb.createCollection(%s)", name, strconv.Quote(first)),
			func(ctx context.Context) error { return r.CreateDatabase(ctx, name, first) },
		}}, &contract.ExecuteResult{NodeID: name, NextAction: contract.EditDatabaseAction}, nil
	case contract.DropDatabaseAction:
		return []step{{
			fmt.Sprintf("use %s;\ndb.dropDatabase()", nodeID),
			func(ctx context.Context) error { return r.DropDatabase(ctx, nodeID) },
		}}, &contract.ExecuteResult{}, nil
	case contract.EditDatabaseAction:
		if name := str(payload[contract.DatabaseTab].New, "name"); name != "" && name != nodeID {
			return nil, nil, contract.Invalid("a database cannot be renamed")
		}

		return nil, nil, contract.Invalid("there is nothing to change on a database")
	case contract.CreateCollectionAction:
		return r.planCreateCollection(nodeID, payload[contract.CollectionTab].New)
	case contract.EditCollectionAction:
		return r.planEditCollection(nodeID, payload)
	case contract.CreateUserAction:
		v := payload[contract.UserTab].New
		db, name, password, roles := str(v, "db"), str(v, "name"), str(v, "password"), str(v, "roles")

		return []step{{
			fmt.Sprintf("use %s;\ndb.createUser({ user: %s, pwd: \"***\", roles: %s })", db, strconv.Quote(name), shellRoles(roles, db)),
			func(ctx context.Context) error { return r.CreateUser(ctx, db, name, password, roles) },
		}}, &contract.ExecuteResult{NodeID: userNodePrefix + db + ":" + name, NextAction: contract.EditUserAction}, nil
	case contract.EditUserAction:
		db, name, err := userNode(nodeID)
		if err != nil {
			return nil, nil, err
		}

		v := payload[contract.UserTab].New
		password, roles := str(v, "password"), str(v, "roles")
		preview := fmt.Sprintf("use %s;\ndb.updateUser(%s, { roles: %s })", db, strconv.Quote(name), shellRoles(roles, db))

		if password != "" {
			preview = fmt.Sprintf("use %s;\ndb.updateUser(%s, { pwd: \"***\", roles: %s })", db, strconv.Quote(name), shellRoles(roles, db))
		}

		return []step{{preview, func(ctx context.Context) error { return r.UpdateUser(ctx, db, name, password, roles) }}}, &contract.ExecuteResult{NodeID: nodeID, NextAction: contract.EditUserAction}, nil
	case contract.DropUserAction:
		db, name, err := userNode(nodeID)
		if err != nil {
			return nil, nil, err
		}

		return []step{{
			fmt.Sprintf("use %s;\ndb.dropUser(%s)", db, strconv.Quote(name)),
			func(ctx context.Context) error { return r.DropUser(ctx, db, name) },
		}}, &contract.ExecuteResult{}, nil
	}

	return nil, nil, contract.Invalid("this action has nothing to change")
}

func shellRoles(raw, db string) string {
	parts := []string{}

	for _, part := range strings.Split(raw, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}

		role, roleDB, _ := strings.Cut(part, "@")
		if strings.TrimSpace(roleDB) == "" {
			roleDB = db
		}

		parts = append(parts, fmt.Sprintf("{ role: %s, db: %s }", strconv.Quote(strings.TrimSpace(role)), strconv.Quote(strings.TrimSpace(roleDB))))
	}

	return "[" + strings.Join(parts, ", ") + "]"
}

func (r *Repository) planCreateCollection(db string, v map[string]any) ([]step, *contract.ExecuteResult, error) {
	name := str(v, "name")

	o, err := collectionOptionsFrom(v)
	if err != nil {
		return nil, nil, err
	}

	return []step{{
		fmt.Sprintf("use %s;\n%s", db, shellCreateCollection(name, o)),
		func(ctx context.Context) error { return r.CreateCollectionWith(ctx, db, name, o) },
	}}, &contract.ExecuteResult{NodeID: db + "/" + name, NextAction: contract.EditCollectionAction}, nil
}

func (r *Repository) planEditCollection(nodeID string, payload map[contract.TreeTab]tabPayload) ([]step, *contract.ExecuteResult, error) {
	db, coll, container := collectionNode(nodeID)
	use := "use " + db + ";\n"
	steps := []step{}

	// Drops come before creates so an edited index can reuse its name.
	for _, col := range payload[contract.CollectionIndexesTab].Columns {
		if !col.Deleted && (col.Added || col.Old == nil) {
			continue
		}

		name := str(col.Old, "name")
		steps = append(steps, step{
			fmt.Sprintf("%sdb.getCollection(%s).dropIndex(%s)", use, strconv.Quote(coll), strconv.Quote(name)),
			func(ctx context.Context) error { return r.DropIndex(ctx, container, name) },
		})
	}

	for _, col := range payload[contract.CollectionIndexesTab].Columns {
		if col.Deleted {
			continue
		}

		spec, err := indexSpecFrom(col.New)
		if err != nil {
			return nil, nil, err
		}

		steps = append(steps, step{use + shellCreateIndex(coll, spec), func(ctx context.Context) error {
			_, err := r.CreateIndex(ctx, container, spec)

			return err
		}})
	}

	if v, ok := payload[contract.CollectionValidationTab]; ok && v.New != nil {
		val := contract.Validator{Validator: str(v.New, "validator"), Level: str(v.New, "level"), Action: str(v.New, "action")}
		rule := val.Validator

		if rule == "" {
			rule = "{}"
		}

		steps = append(steps, step{
			fmt.Sprintf("%sdb.runCommand({ collMod: %s, validator: %s, validationLevel: %s, validationAction: %s })", use, strconv.Quote(coll), rule, strconv.Quote(val.Level), strconv.Quote(val.Action)),
			func(ctx context.Context) error { return r.SetValidator(ctx, container, val) },
		})
	}

	result := &contract.ExecuteResult{NodeID: nodeID, NextAction: contract.EditCollectionAction}

	if g, ok := payload[contract.CollectionTab]; ok && str(g.New, "name") != "" && str(g.New, "name") != coll {
		to := str(g.New, "name")
		result.NodeID = db + "/" + to

		steps = append(steps, step{
			fmt.Sprintf("%sdb.getCollection(%s).renameCollection(%s)", use, strconv.Quote(coll), strconv.Quote(to)),
			func(ctx context.Context) error {
				_, err := r.RenameCollection(ctx, container, to)

				return err
			},
		})
	}

	if len(steps) == 0 {
		return nil, nil, contract.Invalid("there is nothing to change")
	}

	return steps, result, nil
}

func (r *Repository) PreviewExecute(_ context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	steps, _, err := r.plan(nodeID, action, params)
	if err != nil {
		return nil, err
	}

	out := make([]string, 0, len(steps))
	for _, s := range steps {
		out = append(out, s.preview)
	}

	return out, nil
}

func (r *Repository) Execute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) (*contract.ExecuteResult, error) {
	steps, result, err := r.plan(nodeID, action, params)
	if err != nil {
		return nil, err
	}

	for _, s := range steps {
		if err := s.run(ctx); err != nil {
			return nil, err
		}
	}

	return result, nil
}
