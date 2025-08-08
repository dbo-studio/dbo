package databaseContract

type TreeFormFieldTypeEnum string

const (
	FormFieldTypeText        TreeFormFieldTypeEnum = "text"
	FormFieldTypeSelect      TreeFormFieldTypeEnum = "select"
	FormFieldTypeMultiSelect TreeFormFieldTypeEnum = "multi-select"
	FormFieldTypeCheckBox    TreeFormFieldTypeEnum = "checkbox"
)
