package databaseConnection

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/dbo-studio/dbo/internal/app/dto"
	mysqldriver "github.com/go-sql-driver/mysql"
	"github.com/samber/lo"
)

var mysqlTLSConfigCounter atomic.Uint64

var registeredMySQLTLSConfigs sync.Map

func sslOrDefault(ssl *dto.ConnectionSSLParams) *dto.ConnectionSSLParams {
	if ssl == nil {
		return dto.DefaultSSLParams()
	}
	out := *ssl
	out.Mode = dto.NormalizeSSLMode(ssl.Mode)
	return &out
}

func mergeSSLParams(newSSL, oldSSL *dto.ConnectionSSLParams) *dto.ConnectionSSLParams {
	if newSSL == nil {
		return oldSSL
	}
	if oldSSL == nil {
		return sslOrDefault(newSSL)
	}

	merged := &dto.ConnectionSSLParams{
		Mode: dto.NormalizeSSLMode(newSSL.Mode),
	}
	if merged.Mode == "" {
		merged.Mode = oldSSL.Mode
	}
	merged.CACert = helperOptionalString(newSSL.CACert, oldSSL.CACert)
	merged.ClientCert = helperOptionalString(newSSL.ClientCert, oldSSL.ClientCert)
	merged.ClientKey = helperOptionalString(newSSL.ClientKey, oldSSL.ClientKey)
	return merged
}

func helperOptionalString(value, fallback *string) *string {
	if value != nil {
		return value
	}
	return fallback
}

func appendPostgresqlSSLDSN(dsn string, ssl *dto.ConnectionSSLParams) string {
	ssl = sslOrDefault(ssl)
	dsn = strings.TrimSpace(dsn)
	if dsn != "" && !strings.HasSuffix(dsn, " ") {
		dsn += " "
	}
	dsn += fmt.Sprintf("sslmode=%s", ssl.Mode)

	if path := certPathIfFile(lo.FromPtr(ssl.CACert)); path != "" {
		dsn += fmt.Sprintf(" sslrootcert=%s", path)
	}
	if path := certPathIfFile(lo.FromPtr(ssl.ClientCert)); path != "" {
		dsn += fmt.Sprintf(" sslcert=%s", path)
	}
	if path := certPathIfFile(lo.FromPtr(ssl.ClientKey)); path != "" {
		dsn += fmt.Sprintf(" sslkey=%s", path)
	}
	return dsn
}

func appendPostgresqlURISSL(uri string, ssl *dto.ConnectionSSLParams) string {
	ssl = sslOrDefault(ssl)
	if strings.Contains(uri, "sslmode=") {
		return uri
	}
	sep := "?"
	if strings.Contains(uri, "?") {
		sep = "&"
	}
	out := uri + sep + "sslmode=" + ssl.Mode
	if path := certPathIfFile(lo.FromPtr(ssl.CACert)); path != "" {
		out += "&sslrootcert=" + path
	}
	if path := certPathIfFile(lo.FromPtr(ssl.ClientCert)); path != "" {
		out += "&sslcert=" + path
	}
	if path := certPathIfFile(lo.FromPtr(ssl.ClientKey)); path != "" {
		out += "&sslkey=" + path
	}
	return out
}

func appendMysqlTLSQuery(dsn string, ssl *dto.ConnectionSSLParams, serverName string) (string, error) {
	ssl = sslOrDefault(ssl)
	tlsValue, err := mysqlTLSParam(ssl, serverName)
	if err != nil {
		return "", err
	}
	if tlsValue == "" {
		return dsn, nil
	}
	sep := "?"
	if strings.Contains(dsn, "?") {
		sep = "&"
	}
	return dsn + sep + "tls=" + tlsValue, nil
}

func mysqlTLSParam(ssl *dto.ConnectionSSLParams, serverName string) (string, error) {
	ssl = sslOrDefault(ssl)

	if !hasAnyCert(ssl) {
		switch ssl.Mode {
		case dto.SSLModeDisable:
			return "false", nil
		case dto.SSLModeAllow, dto.SSLModePrefer:
			return "preferred", nil
		case dto.SSLModeRequire:
			return "skip-verify", nil
		case dto.SSLModeVerifyCA, dto.SSLModeVerifyFull:
			return "true", nil
		default:
			return "preferred", nil
		}
	}

	cfg, err := buildTLSConfig(ssl, serverName)
	if err != nil {
		return "", err
	}
	if cfg == nil {
		return "false", nil
	}

	name := fmt.Sprintf("dbo-mysql-tls-%d", mysqlTLSConfigCounter.Add(1))
	if err := mysqldriver.RegisterTLSConfig(name, cfg); err != nil {
		return "", fmt.Errorf("register mysql tls config: %w", err)
	}
	registeredMySQLTLSConfigs.Store(name, true)
	return name, nil
}

func hasAnyCert(ssl *dto.ConnectionSSLParams) bool {
	return lo.FromPtr(ssl.CACert) != "" || lo.FromPtr(ssl.ClientCert) != "" || lo.FromPtr(ssl.ClientKey) != ""
}

func certPathIfFile(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || isPEM(value) {
		return ""
	}
	return value
}

func isPEM(value string) bool {
	return strings.Contains(value, "-----BEGIN")
}

func buildTLSConfig(ssl *dto.ConnectionSSLParams, serverName string) (*tls.Config, error) {
	ssl = sslOrDefault(ssl)
	mode := ssl.Mode

	if mode == dto.SSLModeDisable {
		return nil, nil
	}

	cfg := &tls.Config{
		MinVersion: tls.VersionTLS12,
	}

	switch mode {
	case dto.SSLModeRequire, dto.SSLModeAllow, dto.SSLModePrefer:
		cfg.InsecureSkipVerify = true
	case dto.SSLModeVerifyCA:
		cfg.InsecureSkipVerify = true
	case dto.SSLModeVerifyFull:
		cfg.InsecureSkipVerify = false
		cfg.ServerName = serverName
	default:
		cfg.InsecureSkipVerify = true
	}

	rootPEM, err := loadCertMaterial(lo.FromPtr(ssl.CACert))
	if err != nil {
		return nil, fmt.Errorf("ssl ca cert: %w", err)
	}
	if len(rootPEM) > 0 {
		pool := x509.NewCertPool()
		if !pool.AppendCertsFromPEM(rootPEM) {
			return nil, fmt.Errorf("ssl ca cert: failed to parse PEM")
		}
		cfg.RootCAs = pool
	}

	clientCert := lo.FromPtr(ssl.ClientCert)
	clientKey := lo.FromPtr(ssl.ClientKey)
	if clientCert != "" || clientKey != "" {
		if clientCert == "" || clientKey == "" {
			return nil, fmt.Errorf("ssl client cert and key are both required")
		}
		certPEM, err := loadCertMaterial(clientCert)
		if err != nil {
			return nil, fmt.Errorf("ssl client cert: %w", err)
		}
		keyPEM, err := loadCertMaterial(clientKey)
		if err != nil {
			return nil, fmt.Errorf("ssl client key: %w", err)
		}
		cert, err := tls.X509KeyPair(certPEM, keyPEM)
		if err != nil {
			return nil, fmt.Errorf("ssl client key pair: %w", err)
		}
		cfg.Certificates = []tls.Certificate{cert}
	}

	if mode == dto.SSLModeVerifyCA && cfg.RootCAs != nil {
		cfg.VerifyPeerCertificate = makeVerifyPeerWithRoots(cfg.RootCAs)
	}

	return cfg, nil
}

func makeVerifyPeerWithRoots(roots *x509.CertPool) func(rawCerts [][]byte, _ [][]*x509.Certificate) error {
	return func(rawCerts [][]byte, _ [][]*x509.Certificate) error {
		if len(rawCerts) == 0 {
			return fmt.Errorf("tls: no server certificates")
		}
		certs := make([]*x509.Certificate, 0, len(rawCerts))
		for _, raw := range rawCerts {
			cert, err := x509.ParseCertificate(raw)
			if err != nil {
				return fmt.Errorf("tls: parse server certificate: %w", err)
			}
			certs = append(certs, cert)
		}
		opts := x509.VerifyOptions{
			Roots:         roots,
			Intermediates: x509.NewCertPool(),
		}
		for _, inter := range certs[1:] {
			opts.Intermediates.AddCert(inter)
		}
		_, err := certs[0].Verify(opts)
		return err
	}
}

func loadCertMaterial(value string) ([]byte, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	if isPEM(value) {
		return []byte(value), nil
	}
	data, err := os.ReadFile(value)
	if err != nil {
		return nil, err
	}
	return data, nil
}
