package serviceNoSQL

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/helper"
)

// MaxSubscriptionsPerUser caps concurrent streaming tools per owner; each holds a dedicated connection.
const MaxSubscriptionsPerUser = 5

// driverErr answers a caller mistake (contract.Invalid) with 400 and anything else with 500.
func driverErr(err error) error {
	var in contract.InvalidInput
	if errors.As(err, &in) {
		return apperror.BadRequest(err)
	}

	return apperror.InternalServerError(err)
}

var ErrToolNotSupported = errors.New("tool not supported by this connection")

type INoSQLService interface {
	Describe(ctx context.Context, req *dto.NoSQLContainerRequest) (*contract.ContainerSpec, error)
	Browse(ctx context.Context, req *dto.NoSQLBrowseRequest) (*contract.BrowsePage, error)
	Get(ctx context.Context, req *dto.NoSQLItemRequest) (*contract.Item, error)
	Save(ctx context.Context, req *dto.NoSQLSaveRequest) error
	Insert(ctx context.Context, req *dto.NoSQLInsertRequest) (string, error)
	Delete(ctx context.Context, req *dto.NoSQLDeleteRequest) error
	Window(ctx context.Context, req *dto.NoSQLWindowRequest) (*contract.MemberWindow, error)
	ApplyMember(ctx context.Context, req *dto.NoSQLMemberRequest) error
	Stats(ctx context.Context, req *dto.NoSQLContainerRequest) (*contract.ContainerStats, error)
	RecycleList(ctx context.Context, connectionID int32) ([]dto.NoSQLRecycleItem, error)
	RecycleRestore(ctx context.Context, req *dto.NoSQLRecycleRestoreRequest) error
	// BulkDeletePreview counts matches (capped) so the UI can show what a bulk delete would remove.
	BulkDeletePreview(ctx context.Context, req *dto.NoSQLBulkDeleteRequest) (*dto.NoSQLBulkDeletePreview, error)
	// BulkDelete starts a background job and returns its id.
	BulkDelete(ctx context.Context, req *dto.NoSQLBulkDeleteRequest) (uint, error)
	RunCommand(ctx context.Context, req *dto.NoSQLCommandRequest) (*contract.CommandResult, error)
	PubSubChannels(ctx context.Context, req *dto.NoSQLPubSubRequest) ([]string, error)
	PubSubPublish(ctx context.Context, req *dto.NoSQLPubSubRequest) (int64, error)
	// PubSubStream blocks until ctx is done, calling emit for every message.
	PubSubStream(ctx context.Context, req *dto.NoSQLPubSubRequest, emit func(contract.Message) error) error
}

var _ INoSQLService = (*Service)(nil)

type Service struct {
	connectionRepo repository.IConnectionRepo
	cm             *databaseConnection.ConnectionManager
	unlockStore    *serviceSafemode.UnlockStore
	jobManager     serviceJob.IJobManager
	recycleRepo    repository.INoSQLRecycleRepo

	mu   sync.Mutex
	subs map[string]int
}

func NewService(cr repository.IConnectionRepo, cm *databaseConnection.ConnectionManager, appCache cache.Cache, jm serviceJob.IJobManager, rr repository.INoSQLRecycleRepo) *Service {
	// Expired recycle entries also go on a timer, not only when someone lists or deletes.
	go func() {
		for range time.Tick(time.Hour) {
			_ = rr.Prune(context.Background(), "", recycleMaxCount, recycleMaxTotal)
		}
	}()

	return &Service{
		connectionRepo: cr,
		cm:             cm,
		unlockStore:    serviceSafemode.NewUnlockStore(appCache),
		jobManager:     jm,
		recycleRepo:    rr,
		subs:           map[string]int{},
	}
}

// open resolves the connection and its NoSQL driver. SQL connections are rejected.
func (s *Service) open(ctx context.Context, connectionID int32) (contract.NoSQLRepository, uint, error) {
	connection, err := s.connectionRepo.Find(ctx, connectionID)
	if err != nil {
		return nil, 0, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	if !contract.IsNoSQL(connection.ConnectionType) {
		return nil, 0, apperror.BadRequest(fmt.Errorf("connection %d is not a NoSQL connection", connectionID))
	}

	repo, err := database.NewNoSQLRepository(ctx, connection, s.cm)
	if err != nil {
		return nil, 0, apperror.DriverError(err)
	}

	return repo, connection.ID, nil
}

// guard runs the driver's Classify through Safe Mode. Blocked is always rejected.
func (s *Service) guard(ctx context.Context, repo contract.NoSQLRepository, connectionID int32, op contract.Operation, confirmed bool) error {
	class := repo.Classify(op)
	if class == contract.SafetyBlocked {
		return apperror.SafeModeBlocked(map[string]any{"class": string(class), "operation": op.Name})
	}

	connection, err := s.connectionRepo.Find(ctx, connectionID)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	policy := serviceSafemode.FromConnection(connection)
	policy = s.unlockStore.WithUnlock(ctx, helper.CtxOwnerID(ctx), connection.ID, policy)

	// Destructive operations always need explicit confirmation, even in Silent mode.
	if class == contract.SafetyDestructive && !confirmed && !policy.Unlocked {
		return apperror.SafeModeConfirmRequired(map[string]any{
			"class": string(class), "requiresConfirm": true, "reason": "destructive operation requires confirmation", "count": op.Count,
		})
	}

	if err := serviceSafemode.Enforce(policy, serviceSafemode.ClassFromSafety(class), confirmed); err != nil {
		return err
	}

	s.unlockStore.ConsumeGate(ctx, helper.CtxOwnerID(ctx), connection.ID, policy.Unlocked)

	return nil
}

// require rejects an operation the container did not declare, so the UI can never reach a "not supported" path.
func (s *Service) require(ctx context.Context, repo contract.NoSQLRepository, containerID string, caps ...contract.Capability) error {
	spec, err := repo.Describe(ctx, containerID)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	for _, c := range caps {
		if !contract.HasCapability(spec, c) {
			return apperror.BadRequest(fmt.Errorf("container %q does not support %s", containerID, c))
		}
	}

	return nil
}

func (s *Service) Describe(ctx context.Context, req *dto.NoSQLContainerRequest) (*contract.ContainerSpec, error) {
	repo, _, err := s.open(ctx, req.ConnectionID)
	if err != nil {
		return nil, err
	}

	spec, err := repo.Describe(ctx, req.ContainerID)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return spec, nil
}

func (s *Service) Browse(ctx context.Context, req *dto.NoSQLBrowseRequest) (*contract.BrowsePage, error) {
	repo, _, err := s.open(ctx, req.ConnectionID)
	if err != nil {
		return nil, err
	}

	req.Query.Limit = req.Query.ClampLimit(100)

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "browse", ContainerID: req.ContainerID, Raw: req.Query.Filter}, true); err != nil {
		return nil, err
	}

	page, err := repo.Browse(ctx, req.ContainerID, req.Query)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return page, nil
}

func (s *Service) Get(ctx context.Context, req *dto.NoSQLItemRequest) (*contract.Item, error) {
	repo, _, err := s.open(ctx, req.ConnectionID)
	if err != nil {
		return nil, err
	}

	item, err := repo.Get(ctx, req.ContainerID, req.ItemID)
	if err != nil {
		return nil, driverErr(err)
	}

	return item, nil
}

func (s *Service) Save(ctx context.Context, req *dto.NoSQLSaveRequest) error {
	repo, _, err := s.open(ctx, req.ConnectionID)
	if err != nil {
		return err
	}

	caps := []contract.Capability{contract.CapEdit}
	if req.Change.NewID != "" {
		caps = append(caps, contract.CapRename)
	}

	if req.Change.TTLSecs != nil {
		caps = append(caps, contract.CapTTL)
	}

	if err := s.require(ctx, repo, req.ContainerID, caps...); err != nil {
		return err
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "save", ContainerID: req.ContainerID, Count: 1}, req.Confirmed); err != nil {
		return err
	}

	if err := repo.Save(ctx, req.ContainerID, req.ItemID, req.Change); err != nil {
		return driverErr(err)
	}

	return nil
}

func (s *Service) Insert(ctx context.Context, req *dto.NoSQLInsertRequest) (string, error) {
	repo, _, err := s.open(ctx, req.ConnectionID)
	if err != nil {
		return "", err
	}

	if err := s.require(ctx, repo, req.ContainerID, contract.CapInsert); err != nil {
		return "", err
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "insert", ContainerID: req.ContainerID, Count: 1}, req.Confirmed); err != nil {
		return "", err
	}

	id, err := repo.Insert(ctx, req.ContainerID, req.Item)
	if err != nil {
		return "", driverErr(err)
	}

	return id, nil
}

func (s *Service) Delete(ctx context.Context, req *dto.NoSQLDeleteRequest) error {
	repo, _, err := s.open(ctx, req.ConnectionID)
	if err != nil {
		return err
	}

	caps := []contract.Capability{contract.CapDelete}
	if len(req.ItemIDs) > 1 {
		caps = append(caps, contract.CapBulkDelete)
	}

	if err := s.require(ctx, repo, req.ContainerID, caps...); err != nil {
		return err
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "delete", ContainerID: req.ContainerID, Count: len(req.ItemIDs)}, req.Confirmed); err != nil {
		return err
	}

	s.stash(ctx, repo, req.ConnectionID, req.ContainerID, req.ItemIDs)

	if err := repo.Delete(ctx, req.ContainerID, req.ItemIDs); err != nil {
		return driverErr(err)
	}

	return nil
}

// maxBulkPreview bounds the preview scan; larger matches are reported as "at least".
const maxBulkPreview = 100000

func (s *Service) bulkDeleter(ctx context.Context, req *dto.NoSQLBulkDeleteRequest) (contract.NoSQLRepository, contract.BulkDeleter, error) {
	repo, _, err := s.open(ctx, req.ConnectionID)
	if err != nil {
		return nil, nil, err
	}

	if err := s.require(ctx, repo, req.ContainerID, contract.CapBulkDeletePattern); err != nil {
		return nil, nil, err
	}

	deleter, ok := repo.(contract.BulkDeleter)
	if !ok {
		return nil, nil, apperror.BadRequest(ErrToolNotSupported)
	}

	return repo, deleter, nil
}

func (s *Service) BulkDeletePreview(ctx context.Context, req *dto.NoSQLBulkDeleteRequest) (*dto.NoSQLBulkDeletePreview, error) {
	_, deleter, err := s.bulkDeleter(ctx, req)
	if err != nil {
		return nil, err
	}

	n, capped, err := deleter.CountMatching(ctx, req.ContainerID, req.Pattern, maxBulkPreview)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return &dto.NoSQLBulkDeletePreview{Count: n, Capped: capped}, nil
}

func (s *Service) BulkDelete(ctx context.Context, req *dto.NoSQLBulkDeleteRequest) (uint, error) {
	repo, deleter, err := s.bulkDeleter(ctx, req)
	if err != nil {
		return 0, err
	}

	connection, err := s.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return 0, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	// Typed confirmation is checked on the server, so an API client cannot skip it.
	if req.ConfirmName != connection.Name {
		return 0, apperror.BadRequest(errors.New("confirmation name does not match the connection name"))
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "bulk-delete", ContainerID: req.ContainerID, Count: 2, Raw: req.Pattern}, true); err != nil {
		return 0, err
	}

	expected, _, err := deleter.CountMatching(ctx, req.ContainerID, req.Pattern, maxBulkPreview)
	if err != nil {
		return 0, apperror.InternalServerError(err)
	}

	owner := helper.CtxOwnerID(ctx)

	job, err := s.jobManager.CreateJob(model.JobTypeBulkDelete, owner, helper.StructToJSON(dto.NoSQLBulkDeleteJob{
		OwnerID: owner, ConnectionID: req.ConnectionID, ContainerID: req.ContainerID, Pattern: req.Pattern, Expected: expected,
	}))
	if err != nil {
		return 0, apperror.InternalServerError(err)
	}

	return job.ID, nil
}

func (s *Service) RunCommand(ctx context.Context, req *dto.NoSQLCommandRequest) (*contract.CommandResult, error) {
	if err := helper.RequirePermission(ctx, helper.PermCli); err != nil {
		return nil, err
	}

	repo, _, err := s.open(ctx, req.ConnectionID)
	if err != nil {
		return nil, err
	}

	runner, ok := repo.(contract.CommandRunner)
	if !ok {
		return nil, apperror.BadRequest(ErrToolNotSupported)
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "command", Raw: req.Input, Count: 1}, req.Confirmed); err != nil {
		return nil, err
	}

	res, err := runner.RunCommand(ctx, req.Input)
	if err != nil {
		// A rejected command is a user error, not a server fault.
		return nil, apperror.BadRequest(err)
	}

	return res, nil
}

func (s *Service) pubsub(ctx context.Context, connectionID int32) (contract.NoSQLRepository, contract.PubSubProvider, error) {
	repo, _, err := s.open(ctx, connectionID)
	if err != nil {
		return nil, nil, err
	}

	ps, ok := repo.(contract.PubSubProvider)
	if !ok {
		return nil, nil, apperror.BadRequest(ErrToolNotSupported)
	}

	return repo, ps, nil
}

func (s *Service) PubSubChannels(ctx context.Context, req *dto.NoSQLPubSubRequest) ([]string, error) {
	_, ps, err := s.pubsub(ctx, req.ConnectionID)
	if err != nil {
		return nil, err
	}

	channels, err := ps.Channels(ctx, req.Pattern)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return channels, nil
}

func (s *Service) PubSubPublish(ctx context.Context, req *dto.NoSQLPubSubRequest) (int64, error) {
	repo, ps, err := s.pubsub(ctx, req.ConnectionID)
	if err != nil {
		return 0, err
	}

	if req.Channel == "" {
		return 0, apperror.BadRequest(errors.New("channel is required"))
	}

	if err := s.guard(ctx, repo, req.ConnectionID, contract.Operation{Name: "publish", Count: 1, Raw: req.Channel}, req.Confirmed); err != nil {
		return 0, err
	}

	n, err := ps.Publish(ctx, req.Channel, req.Message)
	if err != nil {
		return 0, apperror.InternalServerError(err)
	}

	return n, nil
}

func (s *Service) PubSubStream(ctx context.Context, req *dto.NoSQLPubSubRequest, emit func(contract.Message) error) error {
	_, ps, err := s.pubsub(ctx, req.ConnectionID)
	if err != nil {
		return err
	}

	if len(req.Channels) == 0 {
		return apperror.BadRequest(errors.New("at least one channel is required"))
	}

	owner := helper.CtxOwnerID(ctx)
	if !s.acquire(owner) {
		return apperror.BadRequest(fmt.Errorf("at most %d concurrent subscriptions", MaxSubscriptionsPerUser))
	}
	defer s.release(owner)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	out := make(chan contract.Message)
	subErr := make(chan error, 1)

	go func() { subErr <- ps.Subscribe(ctx, req.Channels, out) }()

	for {
		select {
		case msg := <-out:
			if err := emit(msg); err != nil {
				cancel()
				<-subErr

				return nil
			}
		case err := <-subErr:
			if err != nil && !errors.Is(err, context.Canceled) {
				return apperror.InternalServerError(err)
			}

			return nil
		}
	}
}

func (s *Service) acquire(owner string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.subs[owner] >= MaxSubscriptionsPerUser {
		return false
	}

	s.subs[owner]++

	return true
}

func (s *Service) release(owner string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.subs[owner]--; s.subs[owner] <= 0 {
		delete(s.subs, owner)
	}
}
