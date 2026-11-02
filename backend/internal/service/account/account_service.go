package serviceAccount

import (
	"context"
	"errors"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/dto"
)

type IAccountService interface {
	ConnectStart(ctx context.Context) (*dto.AccountConnectStartResponse, error)
	ConnectPoll(ctx context.Context, req *dto.AccountConnectPollRequest) (*dto.AccountConnectPollResponse, error)
}

type IAccountServiceImpl struct {
	website websiteClient
}

func NewAccountService(cfg *config.Config) IAccountService {
	return &IAccountServiceImpl{website: websiteClient{baseURL: cfg.App.WebsiteAPIURL}}
}

func (s *IAccountServiceImpl) ConnectStart(ctx context.Context) (*dto.AccountConnectStartResponse, error) {
	return s.website.connectStart(ctx)
}

func (s *IAccountServiceImpl) ConnectPoll(ctx context.Context, req *dto.AccountConnectPollRequest) (*dto.AccountConnectPollResponse, error) {
	session, err := s.website.connectPoll(ctx, req)
	if errors.Is(err, errConnectPending) {
		return &dto.AccountConnectPollResponse{Pending: true}, nil
	}

	if err != nil {
		return nil, err
	}

	return &dto.AccountConnectPollResponse{Session: session}, nil
}
