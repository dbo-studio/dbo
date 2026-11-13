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

type (
	NoSQLDocChildrenRequest struct {
		ConnectionID int32    `json:"connectionId"`
		ContainerID  string   `json:"containerId"`
		ItemID       string   `json:"itemId"`
		Path         []string `json:"path"`
		Offset       int      `json:"offset"`
		Limit        int      `json:"limit"`
	}

	NoSQLDocFieldRequest struct {
		ConnectionID int32    `json:"connectionId"`
		ContainerID  string   `json:"containerId"`
		ItemID       string   `json:"itemId"`
		Path         []string `json:"path"`
		Value        string   `json:"value"`
		TypeHint     string   `json:"typeHint"`
		Confirmed    bool     `json:"confirmed"`
	}
)

func (req NoSQLDocChildrenRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
		validation.Field(&req.ItemID, validation.Required),
	)
}

func (req NoSQLDocFieldRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
		validation.Field(&req.ItemID, validation.Required),
		validation.Field(&req.Path, validation.Required),
	)
}

type (
	NoSQLIndexCreateRequest struct {
		ConnectionID int32                      `json:"connectionId"`
		ContainerID  string                     `json:"containerId"`
		Spec         databaseContract.IndexSpec `json:"spec"`
		Confirmed    bool                       `json:"confirmed"`
	}

	NoSQLIndexDropRequest struct {
		ConnectionID int32  `json:"connectionId"`
		ContainerID  string `json:"containerId"`
		Name         string `json:"name"`
		Confirmed    bool   `json:"confirmed"`
	}
)

func (req NoSQLIndexCreateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
	)
}

func (req NoSQLIndexDropRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
		validation.Field(&req.Name, validation.Required),
	)
}

type NoSQLAggregateRequest struct {
	ConnectionID int32  `json:"connectionId"`
	ContainerID  string `json:"containerId"`
	Pipeline     string `json:"pipeline"`
	Limit        int    `json:"limit"`
}

func (req NoSQLAggregateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
		validation.Field(&req.Pipeline, validation.Required),
	)
}

type (
	NoSQLSchemaRequest struct {
		ConnectionID int32  `json:"connectionId"`
		ContainerID  string `json:"containerId"`
		Sample       int    `json:"sample"`
	}

	NoSQLValidatorRequest struct {
		ConnectionID int32                      `json:"connectionId"`
		ContainerID  string                     `json:"containerId"`
		Validator    databaseContract.Validator `json:"validator"`
		Confirmed    bool                       `json:"confirmed"`
	}
)

func (req NoSQLSchemaRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
	)
}

func (req NoSQLValidatorRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
	)
}

type (
	NoSQLExportRequest struct {
		ConnectionID int32  `json:"connectionId"`
		ContainerID  string `json:"containerId"`
		Filter       string `json:"filter"`
	}

	NoSQLImportRequest struct {
		ConnectionID int32  `json:"connectionId"`
		ContainerID  string `json:"containerId"`
		Data         string `json:"data"`
		Format       string `json:"format"` // ndjson | json
		Confirmed    bool   `json:"confirmed"`
	}

	NoSQLCollectionRenameRequest struct {
		ConnectionID int32  `json:"connectionId"`
		ContainerID  string `json:"containerId"`
		NewName      string `json:"newName"`
		Confirmed    bool   `json:"confirmed"`
	}

	NoSQLCollectionDropRequest struct {
		ConnectionID int32  `json:"connectionId"`
		ContainerID  string `json:"containerId"`
		Confirmed    bool   `json:"confirmed"`
	}
)

func (req NoSQLExportRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
	)
}

func (req NoSQLImportRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
		validation.Field(&req.Data, validation.Required),
		validation.Field(&req.Format, validation.In("ndjson", "json")),
	)
}

func (req NoSQLCollectionRenameRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
		validation.Field(&req.NewName, validation.Required),
	)
}

func (req NoSQLCollectionDropRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.ContainerID, validation.Required),
	)
}

type (
	// NoSQLImportStartRequest starts a background import of an uploaded file. Path is a server-side temp file the
	// handler wrote; clients never name it.
	NoSQLImportStartRequest struct {
		ConnectionID int32
		ContainerID  string
		Format       string
		Path         string
		Confirmed    bool
	}

	// NoSQLImportJob is the job payload.
	NoSQLImportJob struct {
		OwnerID      string `json:"ownerId"`
		ConnectionID int32  `json:"connectionId"`
		ContainerID  string `json:"containerId"`
		Format       string `json:"format"`
		Path         string `json:"path"`
	}
)
