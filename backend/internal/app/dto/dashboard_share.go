package dto

import (
	"time"

	"github.com/invopop/validation"
)

type (
	DashboardShareCreateRequest struct {
		// ExpiresAt is empty for a link that never expires.
		ExpiresAt *time.Time `json:"expiresAt"`
		// Password is empty for a link anyone can open.
		Password string `json:"password"`
		// AllowFilters lets viewers change the report filters; off, they see the saved values.
		AllowFilters bool `json:"allowFilters"`
	}

	DashboardShareUpdateRequest struct {
		ExpiresAt   *time.Time `json:"expiresAt"`
		ClearExpiry bool       `json:"clearExpiry"`
		// Password: absent leaves it, empty removes it, anything else replaces it.
		Password     *string `json:"password"`
		AllowFilters *bool   `json:"allowFilters"`
	}

	DashboardShareViewRequest struct {
		Password string `json:"password"`
		// Params are the viewer's filter values; they only count on a link that allows filters.
		Params map[string]string `json:"params"`
	}

	DashboardShareVisitResponse struct {
		ViewedAt time.Time `json:"viewedAt"`
		Outcome  string    `json:"outcome"`
		IP       string    `json:"ip"`
	}

	DashboardShareResponse struct {
		ID           uint       `json:"id"`
		CreatedAt    time.Time  `json:"createdAt"`
		ExpiresAt    *time.Time `json:"expiresAt"`
		Revoked      bool       `json:"revoked"`
		HasPassword  bool       `json:"hasPassword"`
		AllowFilters bool       `json:"allowFilters"`
		ViewCount    int        `json:"viewCount"`
		LastViewedAt *time.Time `json:"lastViewedAt"`
		// Token is the secret part of the link. It is only sent when the link is made.
		Token string `json:"token,omitempty"`
	}

	DashboardShareListResponse struct {
		// Available is false when the app runs as a desktop app, where nobody else can reach a link.
		Available bool                     `json:"available"`
		Items     []DashboardShareResponse `json:"items"`
	}

	PublicColumn struct {
		Name string `json:"name"`
	}

	// PublicResult is rows and column names only: the query that produced them stays private.
	PublicResult struct {
		Columns []PublicColumn   `json:"columns"`
		Rows    []map[string]any `json:"rows"`
	}

	// PublicCardResponse is one report of a shared dashboard: its name, chart and rows, never its SQL.
	PublicCardResponse struct {
		ID     uint          `json:"id"`
		Name   string        `json:"name"`
		Width  int           `json:"width"`
		Chart  QuestionChart `json:"chart"`
		Result *PublicResult `json:"result,omitempty"`
		Error  string        `json:"error,omitempty"`
	}

	// PublicFilter is a filter a viewer may set: its name and type, and the value the page starts from.
	PublicFilter struct {
		Name  string `json:"name"`
		Type  string `json:"type"`
		Value string `json:"value"`
	}

	PublicDashboardResponse struct {
		Name string `json:"name"`
		// Filters is empty unless the link lets viewers change them.
		Filters     []PublicFilter       `json:"filters"`
		GeneratedAt time.Time            `json:"generatedAt"`
		Cards       []PublicCardResponse `json:"cards"`
	}
)

const maxSharePasswordBytes = 72 // bcrypt ignores the rest

func futureTime(value any) error {
	t, _ := value.(*time.Time)
	if t != nil && !t.After(time.Now()) {
		return validation.NewError("validation_future", "the expiry must be in the future")
	}

	return nil
}

func (req DashboardShareCreateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ExpiresAt, validation.By(futureTime)),
		validation.Field(&req.Password, validation.Length(0, maxSharePasswordBytes)),
	)
}

func (req DashboardShareUpdateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ExpiresAt, validation.By(futureTime)),
		validation.Field(&req.Password, validation.NilOrNotEmpty.When(false), validation.By(func(value any) error {
			if p, _ := value.(*string); p != nil && len(*p) > maxSharePasswordBytes {
				return validation.NewError("validation_length", "the password is too long")
			}

			return nil
		})),
	)
}
