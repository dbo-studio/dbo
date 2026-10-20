package serviceAiChangeset

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceSchema "github.com/dbo-studio/dbo/internal/service/schema"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
)

// describedChangesets caps how many recent changesets the agent is told about.
const describedChangesets = 5

type IAiChangesetService interface {
	Create(ctx context.Context, chatID uint, req *dto.SchemaChangeRequest) (*dto.AiChangesetResponse, error)
	Index(ctx context.Context, chatID uint) ([]dto.AiChangesetResponse, error)
	Review(ctx context.Context, chatID, changesetID uint, req *dto.AiChangesetReviewRequest) (*dto.AiChangesetResponse, error)
	// EditOp replaces the definition of an op that was not applied yet and puts it back to pending.
	EditOp(ctx context.Context, chatID, changesetID uint, position int, edited *dto.SchemaChangeOp) (*dto.AiChangesetResponse, error)
	// PreviewOp counts the rows a write op would change and reads a few of them, without changing anything.
	PreviewOp(ctx context.Context, chatID, changesetID uint, position int) (*dto.WritePreviewResponse, error)
	// Before reads the live definition of the tables the changeset changes.
	Before(ctx context.Context, chatID, changesetID uint) (map[string]*contract.TableStructure, error)
	Preview(ctx context.Context, chatID, changesetID uint) ([]string, error)
	Apply(ctx context.Context, chatID, changesetID uint, req *dto.AiChangesetApplyRequest) (*dto.AiChangesetResponse, error)
	// Describe tells the agent how the user reviewed its earlier proposals.
	Describe(ctx context.Context, chatID uint) (string, error)
	// Audit lists the caller's apply attempts on a connection, newest first.
	Audit(ctx context.Context, req *dto.AiAuditListRequest) ([]dto.AiAuditEntryResponse, error)
}

var _ IAiChangesetService = (*IAiChangesetServiceImpl)(nil)

type IAiChangesetServiceImpl struct {
	aiChangesetRepo repository.IAiChangesetRepo
	aiAuditRepo     repository.IAiAuditRepo
	aiChatRepo      repository.IAiChatRepo
	connectionRepo  repository.IConnectionRepo
	schemaService   serviceSchema.ISchemaService
	logger          logger.Logger
}

func NewAiChangesetService(
	aiChangesetRepo repository.IAiChangesetRepo,
	aiAuditRepo repository.IAiAuditRepo,
	aiChatRepo repository.IAiChatRepo,
	connectionRepo repository.IConnectionRepo,
	schemaService serviceSchema.ISchemaService,
	logger logger.Logger,
) IAiChangesetService {
	return &IAiChangesetServiceImpl{
		aiChangesetRepo: aiChangesetRepo,
		aiAuditRepo:     aiAuditRepo,
		aiChatRepo:      aiChatRepo,
		connectionRepo:  connectionRepo,
		schemaService:   schemaService,
		logger:          logger,
	}
}

// requireChat checks that the chat belongs to the caller and still has its connection.
func (s IAiChangesetServiceImpl) requireChat(ctx context.Context, chatID uint) error {
	chat, err := s.aiChatRepo.Find(ctx, chatID, &dto.PaginationRequest{Page: lo.ToPtr(1), Count: lo.ToPtr(1)})
	if err != nil {
		return apperror.NotFound(apperror.ErrAiChatNotFound)
	}

	if _, err := s.connectionRepo.Find(ctx, int32(chat.ConnectionID)); err != nil {
		return apperror.NotFound(apperror.ErrAiChatNotFound)
	}

	return nil
}

func (s IAiChangesetServiceImpl) find(ctx context.Context, chatID, changesetID uint) (*model.AiChangeset, error) {
	if err := s.requireChat(ctx, chatID); err != nil {
		return nil, err
	}

	changeset, err := s.aiChangesetRepo.Find(ctx, chatID, changesetID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrAiChangesetNotFound)
	}

	return changeset, nil
}

func (s IAiChangesetServiceImpl) response(ctx context.Context, changeset *model.AiChangeset) (*dto.AiChangesetResponse, error) {
	connection, err := s.connectionRepo.Find(ctx, int32(changeset.ConnectionID))
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	return changesetToResponse(changeset, connection.ConnectionType)
}

// Create adds the ops to the chat's open changeset for the same database and
// schema, so a chat has one changeset to review; with none open it starts one.
func (s IAiChangesetServiceImpl) Create(ctx context.Context, chatID uint, req *dto.SchemaChangeRequest) (*dto.AiChangesetResponse, error) {
	if err := s.requireChat(ctx, chatID); err != nil {
		return nil, err
	}

	existing, err := s.aiChangesetRepo.List(ctx, chatID)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	slices.Reverse(existing)

	open, found := lo.Find(existing, func(changeset model.AiChangeset) bool {
		return changeset.ConnectionID == uint(req.ConnectionID) &&
			changeset.Database == lo.FromPtr(req.Database) &&
			changeset.Schema == lo.FromPtr(req.Schema) &&
			lo.ContainsBy(changeset.Ops, func(op model.AiChangesetOp) bool { return isOpenStatus(op.Status) })
	})

	first := 0
	if found {
		first = len(open.Ops)
	}

	ops := make([]model.AiChangesetOp, len(req.Ops))

	for i, op := range req.Ops {
		raw, err := json.Marshal(op)
		if err != nil {
			return nil, apperror.InternalServerError(err)
		}

		ops[i] = model.AiChangesetOp{Position: first + i, OpJSON: string(raw), Status: model.AiChangesetOpPending}
	}

	if found {
		for i := range ops {
			ops[i].ChangesetID = open.ID
		}

		if err := s.aiChangesetRepo.AddOps(ctx, ops); err != nil {
			return nil, apperror.InternalServerError(err)
		}

		open.Ops = append(open.Ops, ops...)

		return s.response(ctx, &open)
	}

	changeset := &model.AiChangeset{
		ChatID:       chatID,
		ConnectionID: uint(req.ConnectionID),
		Database:     lo.FromPtr(req.Database),
		Schema:       lo.FromPtr(req.Schema),
		Ops:          ops,
	}

	if err := s.aiChangesetRepo.Create(ctx, changeset); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return s.response(ctx, changeset)
}

func (s IAiChangesetServiceImpl) Index(ctx context.Context, chatID uint) ([]dto.AiChangesetResponse, error) {
	if err := s.requireChat(ctx, chatID); err != nil {
		return nil, err
	}

	changesets, err := s.aiChangesetRepo.List(ctx, chatID)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	result := make([]dto.AiChangesetResponse, len(changesets))

	for i := range changesets {
		item, err := s.response(ctx, &changesets[i])
		if err != nil {
			return nil, err
		}

		result[i] = *item
	}

	return result, nil
}

func (s IAiChangesetServiceImpl) Review(ctx context.Context, chatID, changesetID uint, req *dto.AiChangesetReviewRequest) (*dto.AiChangesetResponse, error) {
	changeset, err := s.find(ctx, chatID, changesetID)
	if err != nil {
		return nil, err
	}

	targets := make([]*model.AiChangesetOp, 0, len(changeset.Ops))

	for i := range changeset.Ops {
		op := &changeset.Ops[i]

		if req.Position == nil && op.Status != model.AiChangesetOpApplied || req.Position != nil && op.Position == *req.Position {
			targets = append(targets, op)
		}
	}

	if len(targets) == 0 {
		return nil, apperror.BadRequest(errors.New("no matching change to review"))
	}

	for _, op := range targets {
		if op.Status == model.AiChangesetOpApplied {
			return nil, apperror.Conflict(errors.New("this change was already applied"))
		}

		op.Status = model.AiChangesetOpStatus(req.Status)
		op.Error = ""
	}

	if err := s.aiChangesetRepo.SaveOps(ctx, lo.Map(targets, func(op *model.AiChangesetOp, _ int) model.AiChangesetOp { return *op })); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return s.response(ctx, changeset)
}

func (s IAiChangesetServiceImpl) EditOp(ctx context.Context, chatID, changesetID uint, position int, edited *dto.SchemaChangeOp) (*dto.AiChangesetResponse, error) {
	changeset, err := s.find(ctx, chatID, changesetID)
	if err != nil {
		return nil, err
	}

	row, found := lo.Find(changeset.Ops, func(op model.AiChangesetOp) bool { return op.Position == position })
	if !found {
		return nil, apperror.BadRequest(errors.New("no matching change to edit"))
	}

	if row.Status == model.AiChangesetOpApplied {
		return nil, apperror.Conflict(errors.New("this change was already applied"))
	}

	current, err := decodeOps([]*model.AiChangesetOp{&row})
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if edited.Op != current[0].Op || edited.Table != current[0].Table {
		return nil, apperror.BadRequest(errors.New("an edit cannot change the kind or table of a change"))
	}

	raw, err := json.Marshal(edited)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	row.OpJSON, row.Status, row.Error = string(raw), model.AiChangesetOpPending, ""

	if err := s.aiChangesetRepo.SaveOps(ctx, []model.AiChangesetOp{row}); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	changeset.Ops[position] = row

	return s.response(ctx, changeset)
}

// changeRequest builds the schema request for the ops that are still open:
// not rejected and not applied yet. It also returns those ops' stored rows,
// in request order.
func changeRequest(changeset *model.AiChangeset) (*dto.SchemaChangeRequest, []*model.AiChangesetOp, error) {
	open := lo.FilterMap(changeset.Ops, func(op model.AiChangesetOp, i int) (*model.AiChangesetOp, bool) {
		return &changeset.Ops[i], isOpenStatus(op.Status)
	})

	if len(open) == 0 {
		return nil, nil, apperror.BadRequest(errors.New("no changes left to apply"))
	}

	ops, err := decodeOps(open)
	if err != nil {
		return nil, nil, apperror.InternalServerError(err)
	}

	return &dto.SchemaChangeRequest{
		ConnectionID: int32(changeset.ConnectionID),
		Database:     lo.EmptyableToPtr(changeset.Database),
		Schema:       lo.EmptyableToPtr(changeset.Schema),
		Ops:          ops,
	}, open, nil
}

func (s IAiChangesetServiceImpl) PreviewOp(ctx context.Context, chatID, changesetID uint, position int) (*dto.WritePreviewResponse, error) {
	changeset, err := s.find(ctx, chatID, changesetID)
	if err != nil {
		return nil, err
	}

	row, found := lo.Find(changeset.Ops, func(op model.AiChangesetOp) bool { return op.Position == position })
	if !found {
		return nil, apperror.BadRequest(errors.New("no matching change"))
	}

	ops, err := decodeOps([]*model.AiChangesetOp{&row})
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if ops[0].Op != dto.SchemaChangeWrite {
		return nil, apperror.BadRequest(errors.New("only a data change can be previewed"))
	}

	return s.schemaService.PreviewWrite(ctx, &dto.WritePreviewRequest{
		ConnectionID: int32(changeset.ConnectionID),
		Database:     lo.EmptyableToPtr(changeset.Database),
		Schema:       lo.EmptyableToPtr(changeset.Schema),
		SQL:          ops[0].SQL,
	})
}

func (s IAiChangesetServiceImpl) Before(ctx context.Context, chatID, changesetID uint) (map[string]*contract.TableStructure, error) {
	changeset, err := s.find(ctx, chatID, changesetID)
	if err != nil {
		return nil, err
	}

	ops, err := decodeOps(lo.Map(changeset.Ops, func(_ model.AiChangesetOp, i int) *model.AiChangesetOp { return &changeset.Ops[i] }))
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	// Tables the changeset creates have nothing to show before.
	existing := lo.Reject(ops, func(op dto.SchemaChangeOp, _ int) bool {
		return lo.ContainsBy(ops, func(other dto.SchemaChangeOp) bool {
			return other.Op == dto.SchemaChangeCreateTable && other.Table == op.Table
		})
	})

	return s.schemaService.TableStructures(ctx, &dto.SchemaChangeRequest{
		ConnectionID: int32(changeset.ConnectionID),
		Database:     lo.EmptyableToPtr(changeset.Database),
		Schema:       lo.EmptyableToPtr(changeset.Schema),
		Ops:          existing,
	})
}

func (s IAiChangesetServiceImpl) Preview(ctx context.Context, chatID, changesetID uint) ([]string, error) {
	changeset, err := s.find(ctx, chatID, changesetID)
	if err != nil {
		return nil, err
	}

	req, _, err := changeRequest(changeset)
	if err != nil {
		return nil, err
	}

	return s.schemaService.PreviewChange(ctx, req)
}

// Apply regenerates the SQL from the stored ops, so the client never supplies
// DDL. Postgres and SQLite run it in one transaction; MySQL stops on the first
// failing step and the response reports each op's outcome.
func (s IAiChangesetServiceImpl) Apply(ctx context.Context, chatID, changesetID uint, apply *dto.AiChangesetApplyRequest) (*dto.AiChangesetResponse, error) {
	changeset, err := s.find(ctx, chatID, changesetID)
	if err != nil {
		return nil, err
	}

	req, open, err := changeRequest(changeset)
	if err != nil {
		return nil, err
	}

	req.Confirmed = apply.Confirmed

	// Read the SQL before it runs: the audit entry shows what was attempted even when the apply fails.
	statements, _ := s.schemaService.PreviewChange(ctx, req)

	result, applyErr := s.schemaService.ApplyChange(ctx, req)
	if result == nil {
		s.audit(ctx, changeset, open, statements, nil, applyErr)

		return nil, applyErr
	}

	touched := make([]model.AiChangesetOp, 0, len(result.Applied)+len(result.Failed))

	for _, i := range result.Applied {
		open[i].Status, open[i].Error = model.AiChangesetOpApplied, ""
		touched = append(touched, *open[i])
	}

	for _, i := range result.Failed {
		open[i].Status, open[i].Error = model.AiChangesetOpFailed, applyErr.Error()
		touched = append(touched, *open[i])
	}

	if err := s.aiChangesetRepo.SaveOps(context.WithoutCancel(ctx), touched); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	s.audit(ctx, changeset, open, statements, result, applyErr)

	return s.response(ctx, changeset)
}

// audit logs an apply attempt. A failing log must not turn an applied change
// into an error, so it is reported to the server log only.
func (s IAiChangesetServiceImpl) audit(
	ctx context.Context,
	changeset *model.AiChangeset,
	open []*model.AiChangesetOp,
	statements []string,
	result *serviceSchema.ChangeResult,
	applyErr error,
) {
	entry := &model.AiAuditEntry{
		ConnectionID: changeset.ConnectionID,
		ChatID:       changeset.ChatID,
		ChangesetID:  changeset.ID,
		SQL:          strings.Join(statements, ";\n"),
		Status:       model.AiAuditFailed,
	}

	if ops, err := decodeOps(open); err == nil {
		entry.Summary = strings.Join(lo.Map(ops, func(op dto.SchemaChangeOp, _ int) string { return opLabel(op) }), "; ")
	}

	if applyErr != nil {
		entry.Error = applyErr.Error()
	}

	if result != nil && len(result.Applied) > 0 {
		entry.Status = model.AiAuditApplied
		if len(result.Failed) > 0 {
			entry.Status = model.AiAuditPartial
		}
	}

	if err := s.aiAuditRepo.Create(context.WithoutCancel(ctx), entry); err != nil {
		s.logger.Error(fmt.Sprintf("Failed to write audit entry: %v", err))
	}
}

func (s IAiChangesetServiceImpl) Audit(ctx context.Context, req *dto.AiAuditListRequest) ([]dto.AiAuditEntryResponse, error) {
	if _, err := s.connectionRepo.Find(ctx, req.ConnectionID); err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	entries, err := s.aiAuditRepo.List(ctx, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return lo.Map(entries, func(entry model.AiAuditEntry, _ int) dto.AiAuditEntryResponse {
		return dto.AiAuditEntryResponse{
			ID:          entry.ID,
			ChatID:      entry.ChatID,
			ChangesetID: entry.ChangesetID,
			Summary:     entry.Summary,
			SQL:         entry.SQL,
			Status:      entry.Status,
			Error:       entry.Error,
			CreatedAt:   lo.FromPtr(entry.CreatedAt),
		}
	}), nil
}

func (s IAiChangesetServiceImpl) Describe(ctx context.Context, chatID uint) (string, error) {
	changesets, err := s.aiChangesetRepo.List(ctx, chatID)
	if err != nil {
		return "", err
	}

	if len(changesets) == 0 {
		return "", nil
	}

	var lines []string

	for _, changeset := range lo.Slice(changesets, max(0, len(changesets)-describedChangesets), len(changesets)) {
		ops, err := decodeOps(lo.Map(changeset.Ops, func(_ model.AiChangesetOp, i int) *model.AiChangesetOp { return &changeset.Ops[i] }))
		if err != nil {
			return "", err
		}

		items := lo.Map(changeset.Ops, func(op model.AiChangesetOp, i int) string {
			return fmt.Sprintf("%s (%s)", opLabel(ops[i]), op.Status)
		})
		lines = append(lines, fmt.Sprintf("- changeset %d: %s", changeset.ID, strings.Join(items, "; ")))
	}

	return "Your earlier schema proposals and how the user reviewed them. Only \"applied\" changes exist in the database; do not propose rejected changes again unless asked:\n" + strings.Join(lines, "\n"), nil
}
