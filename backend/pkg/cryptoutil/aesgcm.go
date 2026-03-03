package cryptoutil

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
)

var ErrInvalidKey = errors.New("invalid key")
var ErrDecryptFailed = errors.New("decrypt failed")

func EncryptAESGCM(key []byte, plaintext []byte) (string, error) {
	if len(key) != 32 {
		return "", ErrInvalidKey
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	cipherText := gcm.Seal(nil, nonce, plaintext, nil)
	out := append(nonce, cipherText...)
	return base64.RawURLEncoding.EncodeToString(out), nil
}

func DecryptAESGCM(key []byte, encoded string) ([]byte, error) {
	if len(key) != 32 {
		return nil, ErrInvalidKey
	}
	raw, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	if len(raw) < gcm.NonceSize() {
		return nil, ErrDecryptFailed
	}
	nonce := raw[:gcm.NonceSize()]
	cipherText := raw[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, cipherText, nil)
	if err != nil {
		return nil, ErrDecryptFailed
	}
	return plaintext, nil
}
