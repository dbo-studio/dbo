package repository

import (
	"strings"

	"github.com/dbo-studio/dbo/pkg/cryptoutil"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

var sshSecretFields = []string{"password", "privateKey", "passphrase"}

// transformSSHSecrets applies fn to every SSH secret (including bastion hops)
// in a serialized connection options JSON.
func transformSSHSecrets(options string, fn func(string) (string, error)) (string, error) {
	for prefix := "ssh"; gjson.Get(options, prefix).Exists(); prefix += ".jump" {
		for _, field := range sshSecretFields {
			path := prefix + "." + field

			value := gjson.Get(options, path).String()
			if value == "" {
				continue
			}

			out, err := fn(value)
			if err != nil {
				return options, err
			}

			if options, err = sjson.Set(options, path, out); err != nil {
				return options, err
			}
		}
	}

	return options, nil
}

// sealSSHSecrets encrypts SSH secrets at rest in the app DB.
func sealSSHSecrets(key []byte, options string) (string, error) {
	return transformSSHSecrets(options, func(plain string) (string, error) {
		if strings.HasPrefix(plain, aiKeyCipherPrefix) {
			return plain, nil
		}

		if len(key) == 0 {
			return "", errAIKeyEncryption
		}

		ciphertext, err := cryptoutil.EncryptAESGCM(key, []byte(plain))
		if err != nil {
			return "", err
		}

		return aiKeyCipherPrefix + ciphertext, nil
	})
}

// openSSHSecrets decrypts SSH secrets; undecryptable values become empty.
func openSSHSecrets(key []byte, options string) string {
	out, _ := transformSSHSecrets(options, func(stored string) (string, error) {
		if !strings.HasPrefix(stored, aiKeyCipherPrefix) {
			return stored, nil
		}

		plain, err := cryptoutil.DecryptAESGCM(key, strings.TrimPrefix(stored, aiKeyCipherPrefix))
		if err != nil {
			return "", nil //nolint:nilerr
		}

		return string(plain), nil
	})

	return out
}
