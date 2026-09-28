package serviceSchema

import (
	"context"
	"fmt"
	"regexp"

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
}

type createSpec struct {
	table   string
	columns []dto.SchemaChangeColumn
	fks     []dto.SchemaChangeOp
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

func (s *ISchemaServiceImpl) ApplyChange(ctx context.Context, req *dto.SchemaChangeRequest) error {
	connection, err := s.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	steps, err := buildChangeSteps(connection.ConnectionType, req)
	if err != nil {
		return apperror.BadRequest(err)
	}

	// Enforce once for the whole changeset: a one-shot Safe Mode unlock must
	// cover every step, not just the first.
	policy := serviceSafemode.FromConnection(connection)
	policy = s.unlockStore.WithUnlock(ctx, helper.CtxOwnerID(ctx), connection.ID, policy)

	if err := serviceSafemode.Enforce(policy, sqlguard.ClassDDL, req.Confirmed); err != nil {
		return err
	}

	s.unlockStore.ConsumeGate(ctx, helper.CtxOwnerID(ctx), connection.ID, policy.Unlocked)

	repo, err := database.NewDatabaseRepository(ctx, connection, s.cm)
	if err != nil {
		return err
	}

	defer func() {
		_ = s.cache.DeleteByPrefix(context.WithoutCancel(ctx), cache.ConnectionPrefix(connection.ID))
	}()

	for i, step := range steps {
		if _, err := repo.Execute(ctx, step.nodeID, step.action, step.params); err != nil {
			return apperror.InternalServerError(fmt.Errorf("step %d of %d (%s %s): %w", i+1, len(steps), step.action, step.nodeID, err))
		}
	}

	return nil
}

// buildChangeSteps folds column/FK ops that target tables created in the same
// changeset into their CREATE TABLE, orders creates so FK targets exist first,
// then emits edit-table steps for existing tables.
func buildChangeSteps(connectionType string, req *dto.SchemaChangeRequest) ([]changeStep, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	database := lo.FromPtr(req.Database)
	schema := lo.FromPtr(req.Schema)

	creates := map[string]*createSpec{}

	var (
		createOrder                []string
		addColumns, addForeignKeys []dto.SchemaChangeOp
	)

	for _, op := range req.Ops {
		if op.Op != dto.SchemaChangeCreateTable {
			continue
		}

		if _, exists := creates[op.Table]; exists {
			return nil, fmt.Errorf("table %q is created twice", op.Table)
		}

		creates[op.Table] = &createSpec{table: op.Table, columns: op.Columns}
		createOrder = append(createOrder, op.Table)
	}

	for _, op := range req.Ops {
		spec, created := creates[op.Table]

		switch op.Op {
		case dto.SchemaChangeAddColumn:
			if created {
				spec.columns = append(spec.columns, *op.Column)
			} else {
				addColumns = append(addColumns, op)
			}
		case dto.SchemaChangeAddForeignKey:
			if created {
				spec.fks = append(spec.fks, op)
			} else {
				addForeignKeys = append(addForeignKeys, op)
			}
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

	for _, table := range orderCreates(createOrder, creates) {
		params, err := builder.create(creates[table])
		if err != nil {
			return nil, err
		}

		steps = append(steps, changeStep{nodeID: containerID, action: contract.CreateTableAction, params: params})
	}

	for _, op := range append(addColumns, addForeignKeys...) {
		params, err := builder.edit(op)
		if err != nil {
			return nil, err
		}

		steps = append(steps, changeStep{nodeID: tableID(op.Table), action: contract.EditTableAction, params: params})
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

type paramsBuilder struct {
	create func(spec *createSpec) ([]byte, error)
	edit   func(op dto.SchemaChangeOp) ([]byte, error)
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
		contract.TableForeignKeysTab: dto.PostgresTableForeignKeyParams{Columns: lo.Map(spec.fks, func(op dto.SchemaChangeOp, _ int) dto.PostgresTableForeignKey { return postgresForeignKey(op) })},
	})
}

func postgresEditParams(op dto.SchemaChangeOp) ([]byte, error) {
	if op.Op == dto.SchemaChangeAddColumn {
		return marshalTabs(map[contract.TreeTab]any{
			contract.TableColumnsTab: dto.PostgresTableColumnParams{Columns: []dto.PostgresTableColumn{{Added: lo.ToPtr(true), New: postgresColumn(*op.Column)}}},
		})
	}

	return marshalTabs(map[contract.TreeTab]any{
		contract.TableForeignKeysTab: dto.PostgresTableForeignKeyParams{Columns: []dto.PostgresTableForeignKey{postgresForeignKey(op)}},
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
		contract.TableForeignKeysTab: dto.MysqlTableForeignKeyParams{Columns: lo.Map(spec.fks, func(op dto.SchemaChangeOp, _ int) dto.MysqlTableForeignKey { return mysqlForeignKey(op) })},
	})
}

func mysqlEditParams(op dto.SchemaChangeOp) ([]byte, error) {
	if op.Op == dto.SchemaChangeAddColumn {
		return marshalTabs(map[contract.TreeTab]any{
			contract.TableColumnsTab: dto.MysqlTableColumnParams{Columns: []dto.MysqlTableColumn{{Added: lo.ToPtr(true), New: mysqlColumn(*op.Column)}}},
		})
	}

	return marshalTabs(map[contract.TreeTab]any{
		contract.TableForeignKeysTab: dto.MysqlTableForeignKeyParams{Columns: []dto.MysqlTableForeignKey{mysqlForeignKey(op)}},
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
		contract.TableForeignKeysTab: dto.SQLiteTableForeignKeyParams{Columns: lo.Map(spec.fks, func(op dto.SchemaChangeOp, _ int) dto.SQLiteTableForeignKey { return sqliteForeignKey(op) })},
	})
}

func sqliteEditParams(op dto.SchemaChangeOp) ([]byte, error) {
	if op.Op == dto.SchemaChangeAddColumn {
		return marshalTabs(map[contract.TreeTab]any{
			contract.TableColumnsTab: dto.SQLiteTableColumnParams{Columns: []dto.SQLiteTableColumn{{Added: lo.ToPtr(true), New: sqliteColumn(*op.Column)}}},
		})
	}

	return marshalTabs(map[contract.TreeTab]any{
		contract.TableForeignKeysTab: dto.SQLiteTableForeignKeyParams{Columns: []dto.SQLiteTableForeignKey{sqliteForeignKey(op)}},
	})
}
