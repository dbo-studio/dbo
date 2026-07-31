package databaseConnection

import (
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/invopop/validation"
	"github.com/samber/lo"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type MysqlCreateParams dto.MysqlCreateConnectionParams
type MysqlUpdateParams dto.MysqlUpdateConnectionParams

func CreateMysqlConnection(params json.RawMessage) (string, error) {
	options, err := helper.RawJSONToStruct[MysqlCreateParams](params)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	if err := options.Validate(); err != nil {
		return "", apperror.Validation(err)
	}

	if options.SSL != nil {
		options.SSL.Mode = dto.NormalizeSSLMode(options.SSL.Mode)
	}

	return helper.StructToJSON(options), nil
}

func UpdateMysqlConnection(oldParams json.RawMessage, newParams json.RawMessage) (string, error) {
	oldOptions, err := helper.RawJSONToStruct[MysqlUpdateParams](oldParams)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	newOptions, err := helper.RawJSONToStruct[MysqlUpdateParams](newParams)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	if err := newOptions.Validate(); err != nil {
		return "", apperror.Validation(err)
	}

	newOptions.Host = helper.OptionalAndEmpty(newOptions.Host, oldOptions.Host)
	newOptions.Username = helper.OptionalAndEmpty(newOptions.Username, oldOptions.Username)
	newOptions.Password = helper.OptionalAndEmpty(newOptions.Password, oldOptions.Password)
	newOptions.Port = helper.OptionalAndEmpty(newOptions.Port, oldOptions.Port)
	newOptions.Database = helper.OptionalOrKeep(newOptions.Database, oldOptions.Database)
	newOptions.URI = helper.OptionalOrKeep(newOptions.URI, oldOptions.URI)
	newOptions.SSL = mergeSSLParams(newOptions.SSL, oldOptions.SSL)

	return mysqlUpdateParamsToCreateJSON(newOptions), nil
}

func mysqlUpdateParamsToCreateJSON(opts MysqlUpdateParams) string {
	params := dto.MysqlCreateConnectionParams{
		Host:     lo.FromPtrOr(opts.Host, ""),
		Port:     lo.FromPtrOr(opts.Port, 0),
		Username: lo.FromPtrOr(opts.Username, ""),
		Password: opts.Password,
		Database: opts.Database,
		URI:      opts.URI,
		SSL:      opts.SSL,
	}

	return helper.StructToJSON(params)
}

func OpenMysqlConnection(connection *model.Connection) gorm.Dialector {
	options, err := helper.RawJSONToStruct[dto.MysqlCreateConnectionParams](json.RawMessage(connection.Options))
	if err != nil {
		return nil
	}

	if options.URI != nil && *options.URI != "" {
		uri := *options.URI
		serverName := options.Host
		if serverName == "" {
			if parsed, parseErr := url.Parse(uri); parseErr == nil {
				serverName = parsed.Hostname()
			}
		}
		if !strings.Contains(uri, "tls=") {
			uri, err = appendMysqlTLSQuery(uri, options.SSL, serverName)
			if err != nil {
				return nil
			}
		}
		return mysql.Open(uri)
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8&parseTime=True&loc=Local",
		options.Username,
		lo.FromPtr(options.Password),
		options.Host,
		strconv.Itoa(int(options.Port)),
		lo.FromPtr(options.Database),
	)

	dsn, err = appendMysqlTLSQuery(dsn, options.SSL, options.Host)
	if err != nil {
		return nil
	}

	return mysql.New(mysql.Config{
		DSN: dsn,
	})
}

func DefaultMysqlDatabase(connection *model.Connection) string {
	options, err := helper.RawJSONToStruct[dto.MysqlCreateConnectionParams](json.RawMessage(connection.Options))
	if err != nil {
		return ""
	}

	if options.URI != nil && *options.URI != "" {
		parsed, err := url.Parse(*options.URI)
		if err != nil {
			return ""
		}
		return strings.TrimPrefix(parsed.Path, "/")
	}

	return lo.FromPtr(options.Database)
}

func (req MysqlCreateParams) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Host, validation.When(lo.FromPtr(req.URI) == "", validation.Required), validation.Length(0, 120)),
		validation.Field(&req.Username, validation.When(lo.FromPtr(req.URI) == "", validation.Required), validation.Length(0, 120)),
		validation.Field(&req.Port, validation.When(lo.FromPtr(req.URI) == "", validation.Required), validation.Min(0)),
		validation.Field(&req.Database, validation.Length(0, 120)),
		validation.Field(&req.Password, validation.Length(0, 120)),
		validation.Field(&req.URI, validation.Length(0, 2048)),
		validation.Field(&req.SSL),
	)
}

func (req MysqlUpdateParams) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Host, validation.Length(0, 120)),
		validation.Field(&req.Username, validation.Length(0, 120)),
		validation.Field(&req.Password, validation.Length(0, 120)),
		validation.Field(&req.Port, validation.Min(0)),
		validation.Field(&req.URI, validation.Length(0, 2048)),
		validation.Field(&req.SSL),
	)
}
