package aiProvider

import (
	"context"
	"errors"
	"fmt"
	"net"
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
	ErrRequestTooLong = errors.New("the provider did not answer in time; try again, or raise the timeout in AI settings")
	ErrModelNotFound  = errors.New("the provider does not know this model or URL; check both in AI settings")
	ErrRateLimited    = errors.New("the provider is limiting requests right now; wait a moment and try again")
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
	if errors.As(err, &apiErr) && (apiErr.StatusCode == http.StatusNotFound || apiErr.StatusCode == http.StatusMethodNotAllowed) {
		return ErrNoModelList
	}

	return ProviderError(err)
}

// ProviderError turns a failed provider request into a message the user can act
// on. Errors that did not come from the provider are returned unchanged.
func ProviderError(err error) error {
	var apiErr *openai.Error
	if errors.As(err, &apiErr) {
		switch {
		case apiErr.StatusCode == http.StatusUnauthorized || apiErr.StatusCode == http.StatusForbidden:
			return ErrKeyRejected
		case apiErr.StatusCode == http.StatusNotFound:
			return ErrModelNotFound
		case apiErr.StatusCode == http.StatusTooManyRequests:
			return ErrRateLimited
		case apiErr.StatusCode >= http.StatusInternalServerError:
			return fmt.Errorf("the provider had an error (status %d); try again", apiErr.StatusCode)
		default:
			return fmt.Errorf("the provider refused the request (status %d): %s", apiErr.StatusCode, apiErr.Message)
		}
	}

	if errors.Is(err, context.DeadlineExceeded) {
		return ErrRequestTooLong
	}

	// What the network said (refused, no such host, bad response) helps more than a guess.
	var netErr net.Error
	if errors.As(err, &netErr) {
		return fmt.Errorf("%w: %s", ErrUnreachable, err.Error())
	}

	return err
}
