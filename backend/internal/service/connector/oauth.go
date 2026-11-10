package serviceConnector

import (
	"errors"
	"os"

	"golang.org/x/oauth2"
)

// Built-in OAuth apps, registered by the project, so a user can sign in with one click instead
// of making their own Google Cloud or Dropbox app. They are empty in source and set at build time
// (-ldflags "-X ...BuiltinDropboxClientID=...") or at run time with DBO_OAUTH_<PROVIDER>_CLIENT_ID.
// A desktop app cannot keep a secret, so these are public identifiers and PKCE protects the code.
var (
	BuiltinGoogleClientID     string
	BuiltinGoogleClientSecret string // Google's "Desktop app" clients still need one, though it is not confidential
	BuiltinDropboxClientID    string
	BuiltinOneDriveClientID   string
)

type oauthProvider struct {
	endpoint oauth2.Endpoint
	scopes   []string
	// authParams ask the provider for a long-lived refresh token.
	authParams []oauth2.AuthCodeOption
	env        string
	builtinID  func() string
	builtinSec func() string
}

var oauthProviders = map[string]oauthProvider{
	TypeGDrive: {
		endpoint: oauth2.Endpoint{
			AuthURL:  "https://accounts.google.com/o/oauth2/auth",
			TokenURL: "https://oauth2.googleapis.com/token",
		},
		scopes:     []string{driveScope},
		authParams: []oauth2.AuthCodeOption{oauth2.AccessTypeOffline, oauth2.SetAuthURLParam("prompt", "consent")},
		env:        "GOOGLE",
		builtinID:  func() string { return BuiltinGoogleClientID },
		builtinSec: func() string { return BuiltinGoogleClientSecret },
	},
	TypeDropbox: {
		endpoint: oauth2.Endpoint{
			AuthURL:   "https://www.dropbox.com/oauth2/authorize",
			TokenURL:  "https://api.dropboxapi.com/oauth2/token",
			AuthStyle: oauth2.AuthStyleInParams,
		},
		scopes:     []string{"files.content.write", "files.content.read", "account_info.read"},
		authParams: []oauth2.AuthCodeOption{oauth2.SetAuthURLParam("token_access_type", "offline")},
		env:        "DROPBOX",
		builtinID:  func() string { return BuiltinDropboxClientID },
	},
	TypeOneDrive: {
		endpoint: oauth2.Endpoint{
			AuthURL:   "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
			TokenURL:  "https://login.microsoftonline.com/common/oauth2/v2.0/token",
			AuthStyle: oauth2.AuthStyleInParams,
		},
		scopes:    []string{"Files.ReadWrite.AppFolder", "offline_access"},
		env:       "ONEDRIVE",
		builtinID: func() string { return BuiltinOneDriveClientID },
	},
}

var errNoOAuthApp = errors.New("no OAuth app is set up for this provider; enter your own client ID under Advanced")

// IsOAuthType reports whether a destination type signs in through a provider.
func IsOAuthType(connType string) bool {
	_, ok := oauthProviders[connType]

	return ok
}

// BuiltinAvailable reports whether the project's own OAuth app is configured for a type.
func BuiltinAvailable(connType string) bool {
	id, _ := builtinClient(connType)

	return id != ""
}

func builtinClient(connType string) (id, secret string) {
	p, ok := oauthProviders[connType]
	if !ok {
		return "", ""
	}

	id = os.Getenv("DBO_OAUTH_" + p.env + "_CLIENT_ID")
	if id == "" && p.builtinID != nil {
		id = p.builtinID()
	}

	secret = os.Getenv("DBO_OAUTH_" + p.env + "_CLIENT_SECRET")
	if secret == "" && p.builtinSec != nil {
		secret = p.builtinSec()
	}

	return id, secret
}

// oauthConfig builds the OAuth client for a destination: the user's own app when they entered
// a client ID, otherwise the built-in one.
func oauthConfig(connType string, f fields, redirect string) (*oauth2.Config, error) {
	p, ok := oauthProviders[connType]
	if !ok {
		return nil, ErrUnknownType
	}

	id, secret := f.secret("clientId"), f.secret("clientSecret")
	if id == "" {
		id, secret = builtinClient(connType)
	}

	if id == "" {
		return nil, errNoOAuthApp
	}

	return &oauth2.Config{ClientID: id, ClientSecret: secret, RedirectURL: redirect, Scopes: p.scopes, Endpoint: p.endpoint}, nil
}

// refreshClient returns an HTTP client that signs requests and renews its access token on its own.
func refreshClient(connType string, f fields) (*oauth2.Config, string, error) {
	conf, err := oauthConfig(connType, f, "")
	if err != nil {
		return nil, "", err
	}

	token := f.secret("refreshToken")
	if token == "" {
		return nil, "", errNotAuthorized
	}

	return conf, token, nil
}

var errNotAuthorized = errors.New("this destination is not authorized yet; use Authorize")
