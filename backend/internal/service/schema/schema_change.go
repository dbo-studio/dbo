package serviceSchema

import (
	"cmp"
	"context"
	"fmt"
	"regexp"
	"slices"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
)

// changeStep is one Object Form create/edit-table call. Agent-proposed ops are
// compiled into these so the SQL comes from the same dialect planners the
// Object Form uses.
type changeStep struct {
	nodeID string
	action contract.TreeNodeActionName
	params []byte
	// opIndexes are the request ops this step carries out.
	opIndexes []int
	// outside marks a step that cannot run inside the transaction of the others (CREATE DATABASE).
	outside bool
}

type createSpec struct {
	table     string
	columns   []dto.SchemaChangeColumn
	fks       []dto.SchemaChangeOp
	indexes   []dto.SchemaChangeOp
	opIndexes []int
}

// ChangeResult lists the request ops (by index) that an apply ran. When a
// driver without transactional DDL stops on an error, Failed holds the ops of
// the step that failed and Applied the ops of the steps before it.
type ChangeResult struct {
	Applied []int
	Failed  []int
}

func (s *ISchemaServiceImpl) PreviewChange(ctx context.Context, req *dto.SchemaChangeRequest) ([]string, error) {
	connection, err := s.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	steps, err := buildChangeSteps(connection.ConnectionType, req)
	if err != nil {
		return nil, apperror.BadRequest(err)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, s.cm)
	if err != nil {
		return nil, err
	}

	queries := make([]string, 0, len(steps))
	for _, step := range steps {
		stepQueries, err := repo.PreviewExecute(ctx, step.nodeID, step.action, step.params)
		if err != nil {
			return nil, apperror.InternalServerError(err)
		}

		queries = append(queries, stepQueries...)
	}

	return queries, nil
}

func (s *ISchemaServiceImpl) ApplyChange(ctx context.Context, req *dto.SchemaChangeRequest) (*ChangeResult, error) {
	connection, err := s.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	steps, err := buildChangeSteps(connection.ConnectionType, req)
	if err != nil {
		return nil, apperror.BadRequest(err)
	}

	// Enforce once for the whole changeset: a one-shot Safe Mode unlock must
	// cover every step, not just the first.
	policy := serviceSafemode.FromConnection(connection)
	policy = s.unlockStore.WithUnlock(ctx, helper.CtxOwnerID(ctx), connection.ID, policy)

	// Dropping a column loses data, so it gates like DROP/TRUNCATE does.
	class := sqlguard.ClassDDL
	if lo.ContainsBy(req.Ops, func(op dto.SchemaChangeOp) bool { return op.Op == dto.SchemaChangeDropColumn }) {
		class = sqlguard.ClassCatastrophicDDL
	}

	if err := serviceSafemode.Enforce(policy, class, req.Confirmed); err != nil {
		return nil, err
	}

	s.unlockStore.ConsumeGate(ctx, helper.CtxOwnerID(ctx), connection.ID, policy.Unlocked)

	repo, err := database.NewDatabaseRepository(ctx, connection, s.cm)
	if err != nil {
		return nil, err
	}

	defer func() {
		// Cache keys are owner-scoped (tree, autocomplete); the bare connection prefix matches none of them.
		_ = s.cache.DeleteByPrefix(context.WithoutCancel(ctx), cache.OwnerConnectionPrefix(helper.CtxOwnerID(ctx), connection.ID))
	}()

	atomic, isAtomic := repo.(contract.AtomicExecutor)

	// CREATE DATABASE cannot join a transaction, so it runs first and on its own.
	var outside []changeStep
	if isAtomic {
		outside = lo.Filter(steps, func(step changeStep, _ int) bool { return step.outside })
		steps = lo.Reject(steps, func(step changeStep, _ int) bool { return step.outside })
	}

	result := &ChangeResult{}

	for _, step := range outside {
		if _, err := repo.Execute(ctx, step.nodeID, step.action, step.params); err != nil {
			result.Failed = step.opIndexes

			return result, apperror.InternalServerError(fmt.Errorf("%s failed: %w", step.action, err))
		}

		result.Applied = append(result.Applied, step.opIndexes...)
	}

	if isAtomic && len(steps) > 0 {
		executeSteps := lo.Map(steps, func(step changeStep, _ int) contract.ExecuteStep {
			return contract.ExecuteStep{NodeID: step.nodeID, Action: step.action, Params: step.params}
		})

		if err := atomic.ExecuteAtomic(ctx, executeSteps); err != nil {
			rolledBack := apperror.InternalServerError(fmt.Errorf("schema change rolled back, nothing in it was applied: %w", err))
			if len(result.Applied) == 0 {
				return nil, rolledBack
			}

			// Something already ran outside the transaction: report the rest as failed.
			result.Failed = lo.FlatMap(steps, func(step changeStep, _ int) []int { return step.opIndexes })

			return result, rolledBack
		}

		result.Applied = append(result.Applied, lo.FlatMap(steps, func(step changeStep, _ int) []int { return step.opIndexes })...)

		return result, nil
	}

	for i, step := range steps {
		if _, err := repo.Execute(ctx, step.nodeID, step.action, step.params); err != nil {
			// DDL is not transactional across drivers: report what already ran.
			result.Failed = step.opIndexes

			return result, apperror.InternalServerError(fmt.Errorf("step %d of %d (%s %s) failed; %d earlier step(s) were already applied: %w", i+1, len(steps), step.action, step.nodeID, i, err))
		}

		result.Applied = append(result.Applied, step.opIndexes...)
	}

	return result, nil
}

// buildChangeSteps folds add_column/add_index/add_foreign_key ops that target tables
// created in the same changeset into their CREATE TABLE, orders creates so FK
// targets exist first, then emits one edit-table step per existing table (SQLite
// recreates the table per step, so a table's edits must share a step).
func buildChangeSteps(connectionType string, req *dto.SchemaChangeRequest) ([]changeStep, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	database := lo.FromPtr(req.Database)
	schema := lo.FromPtr(req.Schema)

	creates := map[string]*createSpec{}

	var (
		createOrder []string
		editOrder   []string
	)

	editIndexes := map[string][]int{}
	scopeIndexes := []int{}

	for i, op := range req.Ops {
		if op.Op != dto.SchemaChangeCreateTable {
			continue
		}

		if _, exists := creates[op.Table]; exists {
			return nil, fmt.Errorf("table %q is created twice", op.Table)
		}

		creates[op.Table] = &createSpec{table: op.Table, columns: op.Columns, opIndexes: []int{i}}
		createOrder = append(createOrder, op.Table)
	}

	for i, op := range req.Ops {
		spec, created := creates[op.Table]

		switch {
		case op.Op == dto.SchemaChangeCreateTable:
		case op.IsScopeOp():
			scopeIndexes = append(scopeIndexes, i)
		case op.Op == dto.SchemaChangeAddColumn && created:
			spec.columns = append(spec.columns, *op.Column)
			spec.opIndexes = append(spec.opIndexes, i)
		case op.Op == dto.SchemaChangeAddForeignKey && created:
			spec.fks = append(spec.fks, op)
			spec.opIndexes = append(spec.opIndexes, i)
		case op.Op == dto.SchemaChangeAddIndex && created:
			spec.indexes = append(spec.indexes, op)
			spec.opIndexes = append(spec.opIndexes, i)
		default:
			if _, seen := editIndexes[op.Table]; !seen {
				editOrder = append(editOrder, op.Table)
			}

			editIndexes[op.Table] = append(editIndexes[op.Table], i)
		}
	}

	builder, err := newParamsBuilder(connectionType)
	if err != nil {
		return nil, err
	}

	containerID := databaseCore.FormatNodeID(connectionType, contract.DBNode{Database: database, Schema: schema})
	tableID := func(table string) string {
		return databaseCore.FormatNodeID(connectionType, contract.DBNode{Database: database, Schema: schema, Table: table})
	}

	var steps []changeStep

	// The database comes first, then its schema, then what goes inside them.
	for _, i := range scopeIndexes {
		op := req.Ops[i]

		params, err := scopeParams(connectionType, op)
		if err != nil {
			return nil, err
		}

		step := changeStep{nodeID: databaseCore.FormatNodeID(connectionType, contract.DBNode{}), action: contract.CreateDatabaseAction, params: params, opIndexes: []int{i}, outside: true}
		if op.Op == dto.SchemaChangeCreateSchema {
			step = changeStep{nodeID: databaseCore.FormatNodeID(connectionType, contract.DBNode{Database: database}), action: contract.CreateSchemaAction, params: params, opIndexes: []int{i}}
		}

		steps = append(steps, step)
	}

	slices.SortStableFunc(steps, func(a, b changeStep) int { return cmp.Compare(boolRank(b.outside), boolRank(a.outside)) })

	for _, table := range orderCreates(createOrder, creates) {
		params, err := builder.create(creates[table])
		if err != nil {
			return nil, err
		}

		steps = append(steps, changeStep{nodeID: containerID, action: contract.CreateTableAction, params: params, opIndexes: creates[table].opIndexes})
	}

	for _, table := range orderEdits(editOrder, editIndexes, req.Ops) {
		params, err := builder.edit(lo.Map(editIndexes[table], func(i int, _ int) dto.SchemaChangeOp { return req.Ops[i] }))
		if err != nil {
			return nil, err
		}

		steps = append(steps, changeStep{nodeID: tableID(table), action: contract.EditTableAction, params: params, opIndexes: editIndexes[table]})
	}

	return steps, nil
}

// orderCreates puts tables referenced by another new table's FK first.
// Cycles fall back to proposal order (PG/MySQL add FKs after CREATE anyway).
func orderCreates(order []string, creates map[string]*createSpec) []string {
	visited := map[string]int{}
	result := make([]string, 0, len(order))

	var visit func(table string)

	visit = func(table string) {
		if visited[table] != 0 {
			return
		}

		visited[table] = 1

		for _, fk := range creates[table].fks {
			if _, ok := creates[fk.RefTable]; ok && fk.RefTable != table {
				visit(fk.RefTable)
			}
		}

		visited[table] = 2
		result = append(result, table)
	}

	for _, table := range order {
		visit(table)
	}

	return result
}

// orderEdits puts tables with foreign key ops last, so a key can reference a
// column another table gains in the same changeset.
func orderEdits(order []string, editIndexes map[string][]int, ops []dto.SchemaChangeOp) []string {
	hasForeignKey := func(table string) bool {
		return lo.ContainsBy(editIndexes[table], func(i int) bool { return ops[i].Op == dto.SchemaChangeAddForeignKey })
	}

	return append(lo.Reject(order, func(table string, _ int) bool { return hasForeignKey(table) }), lo.Filter(order, func(table string, _ int) bool { return hasForeignKey(table) })...)
}

type paramsBuilder struct {
	create func(spec *createSpec) ([]byte, error)
	edit   func(ops []dto.SchemaChangeOp) ([]byte, error)
}

func newParamsBuilder(connectionType string) (paramsBuilder, error) {
	switch {
	case contract.IsPostgresFamily(connectionType):
		return paramsBuilder{create: postgresCreateParams, edit: postgresEditParams}, nil
	case contract.IsMysqlFamily(connectionType):
		return paramsBuilder{create: mysqlCreateParams, edit: mysqlEditParams}, nil
	case connectionType == string(contract.Sqlite):
		return paramsBuilder{create: sqliteCreateParams, edit: sqliteEditParams}, nil
	default:
		return paramsBuilder{}, fmt.Errorf("schema changes are not supported for %s connections", connectionType)
	}
}

func marshalTabs(tabs map[contract.TreeTab]any) ([]byte, error) {
	return json.Marshal(tabs)
}

func onDelete(op dto.SchemaChangeOp) *string {
	if op.OnDelete == "" {
		return nil
	}

	return lo.ToPtr(op.OnDelete)
}

func postgresColumn(col dto.SchemaChangeColumn) *dto.PostgresTableColumnData {
	return &dto.PostgresTableColumnData{
		Name:     lo.ToPtr(col.Name),
		DataType: lo.ToPtr(col.Type),
		NotNull:  lo.ToPtr(col.NotNull || col.Primary),
		Primary:  lo.ToPtr(col.Primary),
		Default:  col.Default,
	}
}

func postgresIndex(op dto.SchemaChangeOp) dto.PostgresTableIndex {
	return dto.PostgresTableIndex{
		Added: lo.ToPtr(true),
		New:   &dto.PostgresTableIndexData{IndexName: lo.ToPtr(op.IndexName()), Columns: op.IndexColumns, Unique: lo.ToPtr(op.Unique)},
	}
}

func postgresForeignKey(op dto.SchemaChangeOp) dto.PostgresTableForeignKey {
	return dto.PostgresTableForeignKey{
		Added: lo.ToPtr(true),
		New: &dto.PostgresTableForeignKeyData{
			ConstraintName: lo.ToPtr(op.ForeignKeyName()),
			SourceColumns:  op.FkColumns,
			TargetTable:    lo.ToPtr(op.RefTable),
			TargetColumns:  op.RefColumns,
			OnDelete:       onDelete(op),
		},
	}
}

func postgresCreateParams(spec *createSpec) ([]byte, error) {
	columns := lo.Map(spec.columns, func(col dto.SchemaChangeColumn, _ int) dto.PostgresTableColumn {
		return dto.PostgresTableColumn{Added: lo.ToPtr(true), New: postgresColumn(col)}
	})

	return marshalTabs(map[contract.TreeTab]any{
		contract.GeneralTab:          dto.PostgresTableParams{New: &dto.PostgresTableParamsData{Name: lo.ToPtr(spec.table)}},
		contract.TableColumnsTab:     dto.PostgresTableColumnParams{Columns: columns},
		contract.TableIndexesTab:     dto.PostgresTableIndexParams{Columns: lo.Map(spec.indexes, func(op dto.SchemaChangeOp, _ int) dto.PostgresTableIndex { return postgresIndex(op) })},
		contract.TableForeignKeysTab: dto.PostgresTableForeignKeyParams{Columns: lo.Map(spec.fks, func(op dto.SchemaChangeOp, _ int) dto.PostgresTableForeignKey { return postgresForeignKey(op) })},
	})
}

func postgresEditParams(ops []dto.SchemaChangeOp) ([]byte, error) {
	var (
		columns []dto.PostgresTableColumn
		indexes []dto.PostgresTableIndex
		fks     []dto.PostgresTableForeignKey
	)

	for _, op := range ops {
		switch op.Op {
		case dto.SchemaChangeAddColumn:
			columns = append(columns, dto.PostgresTableColumn{Added: lo.ToPtr(true), New: postgresColumn(*op.Column)})
		case dto.SchemaChangeAlterColumn:
			columns = append(columns, dto.PostgresTableColumn{New: postgresColumn(*op.Column)})
		case dto.SchemaChangeDropColumn:
			dropped := &dto.PostgresTableColumnData{Name: lo.ToPtr(op.ColumnName)}
			columns = append(columns, dto.PostgresTableColumn{Deleted: lo.ToPtr(true), Old: dropped, New: dropped})
		case dto.SchemaChangeAddIndex:
			indexes = append(indexes, postgresIndex(op))
		case dto.SchemaChangeAddForeignKey:
			fks = append(fks, postgresForeignKey(op))
		}
	}

	return marshalTabs(map[contract.TreeTab]any{
		contract.TableColumnsTab:     dto.PostgresTableColumnParams{Columns: columns},
		contract.TableIndexesTab:     dto.PostgresTableIndexParams{Columns: indexes},
		contract.TableForeignKeysTab: dto.PostgresTableForeignKeyParams{Columns: fks},
	})
}

// typeModifiers matches a trailing "(length)" or "(precision, scale)".
var typeModifiers = regexp.MustCompile(`^\s*([^(]+?)\s*\(\s*(\d+)\s*(?:,\s*(\d+)\s*)?\)\s*$`)

// splitTypeModifiers turns "varchar(120)" into ("varchar", "120", nil): the
// MySQL planner takes length/scale as separate fields and ignores them in the
// type string.
func splitTypeModifiers(dataType string) (string, *string, *string) {
	match := typeModifiers.FindStringSubmatch(dataType)
	if match == nil {
		return dataType, nil, nil
	}

	return match[1], lo.ToPtr(match[2]), lo.EmptyableToPtr(match[3])
}

func mysqlColumn(col dto.SchemaChangeColumn) *dto.MysqlTableColumnData {
	dataType, maxLength, numericScale := splitTypeModifiers(col.Type)

	return &dto.MysqlTableColumnData{
		Name:         lo.ToPtr(col.Name),
		DataType:     lo.ToPtr(dataType),
		MaxLength:    maxLength,
		NumericScale: numericScale,
		NotNull:      lo.ToPtr(col.NotNull || col.Primary),
		Primary:      lo.ToPtr(col.Primary),
		Default:      col.Default,
	}
}

func mysqlIndex(op dto.SchemaChangeOp) dto.MysqlTableIndex {
	return dto.MysqlTableIndex{
		Added: lo.ToPtr(true),
		New:   &dto.MysqlTableIndexData{IndexName: lo.ToPtr(op.IndexName()), Columns: op.IndexColumns, NonUnique: lo.ToPtr(!op.Unique)},
	}
}

func mysqlForeignKey(op dto.SchemaChangeOp) dto.MysqlTableForeignKey {
	return dto.MysqlTableForeignKey{
		Added: lo.ToPtr(true),
		New: &dto.MysqlTableForeignKeyData{
			ConstraintName: lo.ToPtr(op.ForeignKeyName()),
			SourceColumns:  op.FkColumns,
			TargetTable:    lo.ToPtr(op.RefTable),
			TargetColumns:  op.RefColumns,
			OnDelete:       onDelete(op),
		},
	}
}

func mysqlCreateParams(spec *createSpec) ([]byte, error) {
	columns := lo.Map(spec.columns, func(col dto.SchemaChangeColumn, _ int) dto.MysqlTableColumn {
		return dto.MysqlTableColumn{Added: lo.ToPtr(true), New: mysqlColumn(col)}
	})

	return marshalTabs(map[contract.TreeTab]any{
		contract.GeneralTab:          dto.MysqlTableParams{New: &dto.MysqlTableParamsData{Name: lo.ToPtr(spec.table)}},
		contract.TableColumnsTab:     dto.MysqlTableColumnParams{Columns: columns},
		contract.TableIndexesTab:     dto.MysqlTableIndexParams{Columns: lo.Map(spec.indexes, func(op dto.SchemaChangeOp, _ int) dto.MysqlTableIndex { return mysqlIndex(op) })},
		contract.TableForeignKeysTab: dto.MysqlTableForeignKeyParams{Columns: lo.Map(spec.fks, func(op dto.SchemaChangeOp, _ int) dto.MysqlTableForeignKey { return mysqlForeignKey(op) })},
	})
}

func mysqlEditParams(ops []dto.SchemaChangeOp) ([]byte, error) {
	var (
		columns []dto.MysqlTableColumn
		indexes []dto.MysqlTableIndex
		fks     []dto.MysqlTableForeignKey
	)

	for _, op := range ops {
		switch op.Op {
		case dto.SchemaChangeAddColumn:
			columns = append(columns, dto.MysqlTableColumn{Added: lo.ToPtr(true), New: mysqlColumn(*op.Column)})
		case dto.SchemaChangeAlterColumn:
			columns = append(columns, dto.MysqlTableColumn{New: mysqlColumn(*op.Column)})
		case dto.SchemaChangeDropColumn:
			dropped := &dto.MysqlTableColumnData{Name: lo.ToPtr(op.ColumnName)}
			columns = append(columns, dto.MysqlTableColumn{Deleted: lo.ToPtr(true), Old: dropped, New: dropped})
		case dto.SchemaChangeAddIndex:
			indexes = append(indexes, mysqlIndex(op))
		case dto.SchemaChangeAddForeignKey:
			fks = append(fks, mysqlForeignKey(op))
		}
	}

	return marshalTabs(map[contract.TreeTab]any{
		contract.TableColumnsTab:     dto.MysqlTableColumnParams{Columns: columns},
		contract.TableIndexesTab:     dto.MysqlTableIndexParams{Columns: indexes},
		contract.TableForeignKeysTab: dto.MysqlTableForeignKeyParams{Columns: fks},
	})
}

func sqliteColumn(col dto.SchemaChangeColumn) *dto.SQLiteTableColumnData {
	return &dto.SQLiteTableColumnData{
		Name:     lo.ToPtr(col.Name),
		DataType: lo.ToPtr(col.Type),
		NotNull:  lo.ToPtr(col.NotNull),
		Default:  col.Default,
	}
}

func sqliteIndex(op dto.SchemaChangeOp) dto.SQLiteIndex {
	return dto.SQLiteIndex{
		Added: lo.ToPtr(true),
		New:   &dto.SQLiteIndexData{Name: lo.ToPtr(op.IndexName()), Columns: op.IndexColumns, Unique: lo.ToPtr(op.Unique)},
	}
}

func sqliteForeignKey(op dto.SchemaChangeOp) dto.SQLiteTableForeignKey {
	return dto.SQLiteTableForeignKey{
		Added: lo.ToPtr(true),
		New: &dto.SQLiteTableForeignKeyData{
			ConstraintName: lo.ToPtr(op.ForeignKeyName()),
			SourceColumns:  op.FkColumns,
			TargetTable:    lo.ToPtr(op.RefTable),
			TargetColumns:  op.RefColumns,
			OnDelete:       onDelete(op),
		},
	}
}

func sqliteCreateParams(spec *createSpec) ([]byte, error) {
	columns := lo.Map(spec.columns, func(col dto.SchemaChangeColumn, _ int) dto.SQLiteTableColumn {
		return dto.SQLiteTableColumn{Added: lo.ToPtr(true), New: sqliteColumn(col)}
	})

	var keys []dto.SQLiteTableKey
	if pk := lo.FilterMap(spec.columns, func(col dto.SchemaChangeColumn, _ int) (string, bool) { return col.Name, col.Primary }); len(pk) > 0 {
		keys = append(keys, dto.SQLiteTableKey{Added: lo.ToPtr(true), New: &dto.SQLiteTableKeyData{Type: lo.ToPtr("PRIMARY KEY"), Columns: pk}})
	}

	return marshalTabs(map[contract.TreeTab]any{
		contract.GeneralTab:          dto.SQLiteTableParams{New: &dto.SQLiteTableParamsData{Name: lo.ToPtr(spec.table)}},
		contract.TableColumnsTab:     dto.SQLiteTableColumnParams{Columns: columns},
		contract.TableKeysTab:        dto.SQLiteTableKeyParams{Keys: keys},
		contract.TableIndexesTab:     dto.SQLiteIndexParams{Indexes: lo.Map(spec.indexes, func(op dto.SchemaChangeOp, _ int) dto.SQLiteIndex { return sqliteIndex(op) })},
		contract.TableForeignKeysTab: dto.SQLiteTableForeignKeyParams{Columns: lo.Map(spec.fks, func(op dto.SchemaChangeOp, _ int) dto.SQLiteTableForeignKey { return sqliteForeignKey(op) })},
	})
}

func sqliteEditParams(ops []dto.SchemaChangeOp) ([]byte, error) {
	var (
		columns []dto.SQLiteTableColumn
		indexes []dto.SQLiteIndex
		fks     []dto.SQLiteTableForeignKey
	)

	for _, op := range ops {
		switch op.Op {
		case dto.SchemaChangeAddColumn:
			columns = append(columns, dto.SQLiteTableColumn{Added: lo.ToPtr(true), New: sqliteColumn(*op.Column)})
		case dto.SchemaChangeAlterColumn:
			columns = append(columns, dto.SQLiteTableColumn{New: sqliteColumn(*op.Column)})
		case dto.SchemaChangeDropColumn:
			dropped := &dto.SQLiteTableColumnData{Name: lo.ToPtr(op.ColumnName)}
			columns = append(columns, dto.SQLiteTableColumn{Deleted: lo.ToPtr(true), Old: dropped, New: dropped})
		case dto.SchemaChangeAddIndex:
			indexes = append(indexes, sqliteIndex(op))
		case dto.SchemaChangeAddForeignKey:
			fks = append(fks, sqliteForeignKey(op))
		}
	}

	return marshalTabs(map[contract.TreeTab]any{
		contract.TableColumnsTab:     dto.SQLiteTableColumnParams{Columns: columns},
		contract.TableIndexesTab:     dto.SQLiteIndexParams{Indexes: indexes},
		contract.TableForeignKeysTab: dto.SQLiteTableForeignKeyParams{Columns: fks},
	})
}

func boolRank(value bool) int {
	if value {
		return 1
	}

	return 0
}

// ValidateScopeOps refuses create_database and create_schema where the engine cannot do them.
func ValidateScopeOps(connectionType string, ops []dto.SchemaChangeOp) error {
	for _, op := range ops {
		switch {
		case op.Op == dto.SchemaChangeCreateDatabase && connectionType == string(contract.Sqlite):
			return fmt.Errorf("SQLite has no databases to create")
		case op.Op == dto.SchemaChangeCreateSchema && !contract.IsPostgresFamily(connectionType):
			return fmt.Errorf("only PostgreSQL has schemas to create")
		}
	}

	return nil
}

// scopeParams are the Object Form params that create the database or schema of an op.
func scopeParams(connectionType string, op dto.SchemaChangeOp) ([]byte, error) {
	if err := ValidateScopeOps(connectionType, []dto.SchemaChangeOp{op}); err != nil {
		return nil, err
	}

	if op.Op == dto.SchemaChangeCreateSchema {
		return marshalTabs(map[contract.TreeTab]any{
			contract.SchemaTab: dto.PostgresSchemaParams{New: &dto.PostgresSchemaParamsData{Name: lo.ToPtr(op.Name)}},
		})
	}

	// MySQL reads the same database params as PostgreSQL.
	return marshalTabs(map[contract.TreeTab]any{
		contract.DatabaseTab: dto.PostgresDatabaseParams{New: &dto.PostgresDatabaseParamsData{Name: lo.ToPtr(op.Name)}},
	})
}
