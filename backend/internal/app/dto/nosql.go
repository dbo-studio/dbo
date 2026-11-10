package dto

import (
	"time"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/invopop/validation"
)

type (
	NoSQLContainerRequest struct {
		ConnectionID int32  `json:"connectionId"`
		ContainerID  string `json:"containerId"`
	}

	NoSQLBrowseRequest struct {
		ConnectionID int32                        `json:"connectionId"`
		ContainerID  string                       `json:"containerId"`
		Query        databaseContract.BrowseQuery `json:"query"`
	}

	NoSQLItemRequest struct {
		ConnectionID int32  `json:"connectionId"`
		ContainerID  string `json:"containerId"`
		ItemID       string `json:"itemId"`
	}

	NoSQLSaveRequest struct {
		ConnectionID int32                       `json:"connectionId"`
		ContainerID  string                      `json:"containerId"`
		ItemID       string                      `json:"itemId"`
		Change       databaseContract.ItemChange `json:"change"`
		Confirmed    bool                        `json:"confirmed"`
	}

	NoSQLInsertRequest struct {
		ConnectionID int32                      `json:"connectionId"`
		ContainerID  string                     `json:"containerId"`
		Item         databaseContract.ItemInput `json:"item"`
		Confirmed    bool                       `json:"confirmed"`
	}

	NoSQLDeleteRequest struct {
		ConnectionID int32    `json:"connectionId"`
		ContainerID  string   `json:"containerId"`
		ItemIDs      []string `json:"itemIds"`
		Confirmed    bool     `json:"confirmed"`
	}

	NoSQLBulkDeleteRequest struct {
		ConnectionID int32  `json:"connectionId"`
		ContainerID  string `json:"containerId"`
		Pattern      string `json:"pattern"`
		// ConfirmName must equal the connection name: typed confirmation for a destructive bulk operation.
		ConfirmName string `json:"confirmName"`
	}

	NoSQLBulkDeletePreview struct {
		Count  int  `json:"count"`
		Capped bool `json:"capped"`
	}

	// NoSQLBulkDeleteJob is the job payload.
	NoSQLBulkDeleteJob struct {
		OwnerID      string `json:"ownerId"`
		ConnectionID int32  `json:"connectionId"`
		ContainerID  string `json:"containerId"`
		Pattern      string `json:"pattern"`
		Expected     int    `json:"expected"`
	}

	NoSQLCommandRequest struct {
		ConnectionID int32  `json:"connectionId"`
		Input        string `json:"input"`
		Confirmed    bool   `json:"confirmed"`
	}

	NoSQLPubSubRequest struct {
		ConnectionID int32    `json:"connectionId"`
		Pattern      string   `json:"pattern"`
		Channels     []string `json:"channels"`
		Channel      string   `json:"channel"`
		Message      string   `json:"message"`
		Confirmed    bool     `json:"confirmed"`
	}
)

func (req NoSQLContainerRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
	)
}

func (req NoSQLBrowseRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
	)
}

func (req NoSQLItemRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
		validation.Field(&req.ItemID, validation.Required),
	)
}

func (req NoSQLSaveRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
		validation.Field(&req.ItemID, validation.Required),
	)
}

func (req NoSQLInsertRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
	)
}

func (req NoSQLDeleteRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
		validation.Field(&req.ItemIDs, validation.Required, validation.Length(1, databaseContract.MaxBrowseLimit)),
	)
}

func (req NoSQLBulkDeleteRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
		validation.Field(&req.Pattern, validation.Required, validation.Length(1, 512)),
		validation.Field(&req.ConfirmName, validation.Required),
	)
}

func (req NoSQLCommandRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.Input, validation.Required, validation.Length(1, 8192)),
	)
}

func (req NoSQLPubSubRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
	)
}

type (
	NoSQLRecycleItem struct {
		ID          uint      `json:"id"`
		ContainerID string    `json:"containerId"`
		ItemID      string    `json:"itemId"`
		Size        int       `json:"size"`
		DeletedAt   time.Time `json:"deletedAt"`
	}

	NoSQLRecycleRestoreRequest struct {
		ConnectionID int32 `json:"connectionId"`
		ID           uint  `json:"id"`
		Confirmed    bool  `json:"confirmed"`
	}
)

type (
	NoSQLWindowRequest struct {
		ConnectionID int32  `json:"connectionId"`
		ContainerID  string `json:"containerId"`
		ItemID       string `json:"itemId"`
		Cursor       string `json:"cursor"`
		Limit        int    `json:"limit"`
	}

	NoSQLMemberRequest struct {
		ConnectionID int32                     `json:"connectionId"`
		ContainerID  string                    `json:"containerId"`
		ItemID       string                    `json:"itemId"`
		Op           databaseContract.MemberOp `json:"op"`
		Confirmed    bool                      `json:"confirmed"`
	}
)
