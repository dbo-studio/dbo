package aiProvider

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
)

// maxListedModels keeps a provider with a huge catalog from flooding the picker.
const maxListedModels = 500

const maxListTimeout = 30 * time.Second

var (
	ErrKeyRejected    = errors.New("the provider rejected the API key")
	ErrUnreachable    = errors.New("could not reach the provider; check the URL and your network")
	ErrNoModelList    = errors.New("this provider does not list its models; type a model id instead")
	ErrRequestTooLong = errors.New("the provider did not answer in time; raise the timeout or check the URL")
)

// ListModels asks the provider which models it serves. It doubles as the
// connection test: it fails when the URL cannot be reached or the key is refused.
func ListModels(ctx context.Context, provider *model.AiProvider) ([]string, error) {
	options := []option.RequestOption{
		option.WithBaseURL(provider.URL),
		option.WithRequestTimeout(listTimeout(provider.Timeout)),
	}

	// Ollama needs no key; every other provider does.
	if provider.APIKey != nil && *provider.APIKey != "" {
		options = append(options, option.WithAPIKey(*provider.APIKey))
	}

	client := openai.NewClient(options...)
	pager := client.Models.ListAutoPaging(ctx)

	var ids []string

	for pager.Next() && len(ids) < maxListedModels {
		ids = append(ids, pager.Current().ID)
	}

	if err := pager.Err(); err != nil {
		return nil, classifyListError(err)
	}

	sort.Strings(ids)

	return ids, nil
}

// listTimeout bounds a connection test: it must fail fast on a wrong URL, so it
// never waits for the long chat timeout.
func listTimeout(seconds int) time.Duration {
	if seconds <= 0 {
		return maxListTimeout
	}

	return min(time.Duration(seconds)*time.Second, maxListTimeout)
}

func classifyListError(err error) error {
	var apiErr *openai.Error
	if errors.As(err, &apiErr) {
		switch apiErr.StatusCode {
		case http.StatusUnauthorized, http.StatusForbidden:
			return ErrKeyRejected
		case http.StatusNotFound, http.StatusMethodNotAllowed:
			return ErrNoModelList
		default:
			return fmt.Errorf("the provider answered with status %d", apiErr.StatusCode)
		}
	}

	if errors.Is(err, context.DeadlineExceeded) {
		return ErrRequestTooLong
	}

	// What the network said (refused, no such host, bad response) helps more than a guess.
	return fmt.Errorf("%w: %s", ErrUnreachable, err.Error())
}
