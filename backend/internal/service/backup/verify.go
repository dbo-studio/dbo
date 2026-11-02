package serviceBackup

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"os"
)

// VerifyFile reports whether a backup file is intact. The checksum is always
// compared. Content is read back too, through gunzip and decryption, when the
// file is compressed or a passphrase is given; an encrypted file without one
// is checked by checksum only.
func VerifyFile(path, name, checksum, passphrase string) (bool, string) {
	f, err := os.Open(path)
	if err != nil {
		return false, "the backup file is missing"
	}

	defer func() { _ = f.Close() }()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return false, "the backup file cannot be read"
	}

	if hex.EncodeToString(h.Sum(nil)) != checksum {
		return false, "checksum mismatch: the file changed since it was made"
	}

	encrypted := IsEncrypted(name)
	if encrypted && passphrase == "" {
		return true, "checksum matches (encrypted: contents not opened, give the passphrase to check them)"
	}

	if !encrypted && !IsCompressed(name) {
		return true, "checksum matches"
	}

	if _, err := f.Seek(0, io.SeekStart); err != nil {
		return false, "the backup file cannot be read"
	}

	if err := unsealStream(f, io.Discard, IsCompressed(name), encrypted, passphrase); err != nil {
		if errors.Is(err, ErrWrongPassphrase) {
			return false, ErrWrongPassphrase.Error()
		}

		return false, "the backup contents are damaged: " + err.Error()
	}

	return true, "checksum matches and the contents read back completely"
}
