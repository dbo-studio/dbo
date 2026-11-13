package serviceNoSQL

import (
	"context"
	"errors"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
)

var errNotAWrite = errors.New("only a write statement can be proposed; use the read tools for reads")

// writer opens the connection's driver and checks it can preview and run write statements.
func (s *Service) writer(ctx context.Context, connectionID int32) (contract.NoSQLRepository, contract.StatementWriter, contract.CommandRunner, error) {
	repo, _, err := s.open(ctx, connectionID)
	if err != nil {
		return nil, nil, nil, err
	}

	w, okW := repo.(contract.StatementWriter)
	r, okR := repo.(contract.CommandRunner)

	if !okW || !okR {
		return nil, nil, nil, apperror.BadRequest(ErrToolNotSupported)
	}

	return repo, w, r, nil
}

// ClassifyWrite rates a statement with the driver's own Safe Mode classes and refuses what is not a write.
func (s *Service) ClassifyWrite(ctx context.Context, connectionID int32, statement string) (contract.SafetyClass, error) {
	repo, _, _, err := s.writer(ctx, connectionID)
	if err != nil {
		return "", err
	}

	class := repo.Classify(contract.Operation{Name: "command", Raw: statement})

	switch class {
	case contract.SafetyBlocked:
		return class, apperror.SafeModeBlocked(map[string]any{"class": string(class), "operation": "command"})
	case contract.SafetyRead:
		return class, apperror.BadRequest(errNotAWrite)
	}

	return class, nil
}

// PreviewStatement says what a write statement would touch, without running it.
func (s *Service) PreviewStatement(ctx context.Context, connectionID int32, statement string) (*contract.WritePreview, error) {
	if _, err := s.ClassifyWrite(ctx, connectionID, statement); err != nil {
		return nil, err
	}

	_, w, _, err := s.writer(ctx, connectionID)
	if err != nil {
		return nil, err
	}

	out, err := w.PreviewStatement(ctx, statement)
	if err != nil {
		return nil, driverErr(err)
	}

	return out, nil
}

// RequireConfirmed refuses, before anything runs, a batch that holds a destructive statement the user has not
// confirmed. Without it a batch would apply its first statements and only then stop at the destructive one.
func (s *Service) RequireConfirmed(ctx context.Context, connectionID int32, statements []string, confirmed bool) error {
	if confirmed {
		return nil
	}

	repo, _, _, err := s.writer(ctx, connectionID)
	if err != nil {
		return err
	}

	for _, statement := range statements {
		if repo.Classify(contract.Operation{Name: "command", Raw: statement}) != contract.SafetyDestructive {
			continue
		}

		connection, err := s.connectionRepo.Find(ctx, connectionID)
		if err != nil {
			return apperror.NotFound(apperror.ErrConnectionNotFound)
		}

		policy := serviceSafemode.FromConnection(connection)
		policy = s.unlockStore.WithUnlock(ctx, helper.CtxOwnerID(ctx), connection.ID, policy)

		// An unlocked connection takes destructive statements without asking, like guard does.
		if !policy.Unlocked {
			return apperror.SafeModeConfirmRequired(map[string]any{
				"class": string(contract.SafetyDestructive), "requiresConfirm": true, "reason": "destructive operation requires confirmation",
			})
		}
	}

	return nil
}

// ApplyStatement runs one write statement under Safe Mode, and returns the statements that undo it.
// The undo is read before the write runs and is best effort: no undo is an answer, not an error.
func (s *Service) ApplyStatement(ctx context.Context, connectionID int32, statement string, confirmed bool) ([]string, string, error) {
	if _, err := s.ClassifyWrite(ctx, connectionID, statement); err != nil {
		return nil, "", err
	}

	repo, w, runner, err := s.writer(ctx, connectionID)
	if err != nil {
		return nil, "", err
	}

	if err := s.guard(ctx, repo, connectionID, contract.Operation{Name: "command", Raw: statement, Count: 1}, confirmed); err != nil {
		return nil, "", err
	}

	capture, capErr := w.CaptureStatement(ctx, statement)

	res, err := runner.RunCommand(ctx, statement)
	if err != nil {
		return nil, "", driverErr(err)
	}

	if capErr != nil || capture == nil {
		return nil, "it could not be read before it ran", nil
	}

	undo := capture.Undo
	if capture.After != nil {
		undo = capture.After(res.Output)
	}

	return undo, capture.Note, nil
}
