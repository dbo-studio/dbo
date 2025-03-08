package dto

import (
	"fmt"

	"github.com/invopop/validation"
)

type (
	UpdateDesignRequest struct {
		ConnectionId int32            `json:"connectionId"`
		Table        string           `json:"table"`
		Schema       string           `json:"schema"`
		Database     string           `json:"database"`
		EditedItems  []EditDesignItem `json:"edited"`
		AddedItems   []AddDesignItem  `json:"added"`
		DeletedItems []string         `json:"deleted"`
	}
	UpdateDesignResponse struct {
		Query        []string `json:"query"`
		RowsAffected int      `json:"rowsAffected"`
	}
)

type (
	EditDesignItem struct {
		Name    string             `json:"name"`
		Length  *int               `json:"length"`
		Type    *string            `json:"type"`
		IsNull  *bool              `json:"isNull"`
		Default *DesignItemDefault `json:"default"`
		Comment *string            `json:"comment"`
		Rename  *string            `json:"rename"`
	}
	AddDesignItem struct {
		Name    string             `json:"name"`
		Length  *int               `json:"length"`
		Type    string             `json:"type"`
		IsNull  *bool              `json:"isNull"`
		Default *DesignItemDefault `json:"default"`
		Comment *string            `json:"comment"`
	}

	DesignItemDefault struct {
		MakeNull  *bool   `json:"makeNull"`
		MakeEmpty *bool   `json:"makeEmpty"`
		Value     *string `json:"value"`
	}
)

func (udr UpdateDesignRequest) Validate() error {
	return validation.ValidateStruct(&udr,
		validation.Field(&udr.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&udr.Table, validation.Required),
		validation.Field(&udr.Schema, validation.Required),
		validation.Field(&udr.Database, validation.Required),
	)
}

func (edt EditDesignItem) Validate() error {
	return validation.ValidateStruct(&edt,
		validation.Field(&edt.Name, validation.Required, validation.Each(validation.By(validateEditedItem))),
	)
}

func (adt AddDesignItem) Validate() error {
	return validation.ValidateStruct(&adt,
		validation.Field(&adt.Name, validation.Required, validation.Each(validation.By(validateAddDesignItem))),
		validation.Field(&adt.Type, validation.Required, validation.Each(validation.By(validateAddDesignItem))),
	)
}

func validateEditedItem(value interface{}) error {
	item, ok := value.(EditDesignItem)
	if !ok {
		return fmt.Errorf("invalid item")
	}
	return item.Validate()
}

func validateAddDesignItem(value interface{}) error {
	item, ok := value.(AddDesignItem)
	if !ok {
		return fmt.Errorf("invalid item")
	}
	return item.Validate()
}
