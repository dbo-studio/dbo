package aiProvider

import (
	"errors"
	"testing"
)

func TestProviderErrorStreamEvent(t *testing.T) {
	err := ProviderError(errors.New(`received error while streaming: {"code":500,"message":"input is nested more than 64 levels deep","type":"server_error"}`))

	want := "the provider failed while answering: input is nested more than 64 levels deep; try again, or rephrase the request"
	if err.Error() != want {
		t.Fatalf("got %q", err.Error())
	}
}
