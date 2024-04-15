package encrypt

import (
	"golang.org/x/crypto/bcrypt"
)

// Hash generates a hashed password from a plaintext string
func Hash(text string) (string, error) {
	pw, err := bcrypt.GenerateFromPassword([]byte(text), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(pw), nil
}

// Check hashed password with plaintext string
func HashCheck(encryptedPassword string, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(encryptedPassword), []byte(password))
	return err == nil
}
