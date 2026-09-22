package passwordpolicy

import (
	"errors"
	"regexp"
	"unicode/utf8"

	validation "github.com/invopop/validation"
)

const (
	minLen = 8
	MaxLen = 40
)

var (
	ErrTooShort   = errors.New("password must be at least 8 characters")
	ErrTooLong    = errors.New("password must be at most 40 characters")
	ErrNeedLetter = errors.New("password must include a letter")
	ErrNeedDigit  = errors.New("password must include a number")
	letterRe      = regexp.MustCompile(`[A-Za-z]`)
	digitRe       = regexp.MustCompile(`[0-9]`)
)

// ValidateNew checks a new account password (change / create / reset / bootstrap).
func ValidateNew(password string) error {
	n := utf8.RuneCountInString(password)
	if n < minLen {
		return ErrTooShort
	}

	if n > MaxLen {
		return ErrTooLong
	}

	if !letterRe.MatchString(password) {
		return ErrNeedLetter
	}

	if !digitRe.MatchString(password) {
		return ErrNeedDigit
	}

	return nil
}

// Rule is an invopop/validation rule for new passwords.
func Rule() validation.Rule {
	return validation.By(func(value any) error {
		s, ok := value.(string)
		if !ok {
			return errors.New("password must be a string")
		}

		return ValidateNew(s)
	})
}
