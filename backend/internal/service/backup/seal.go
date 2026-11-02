package serviceBackup

import (
	"bufio"
	"compress/gzip"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/hkdf"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"

	"golang.org/x/crypto/scrypt"
)

const (
	// Version 2 files carry no key: they are encrypted to a public key, and the
	// matching private key is stored only wrapped by the passphrase.
	sealMagic   = "DBOENC02"
	saltSize    = 16
	nonceSize   = 12
	wrappedSize = saltSize + nonceSize + 32 + 16 // salt, nonce, X25519 private key, GCM tag
	pubSize     = 32
	chunkSize   = 1 << 20
	// maxFrame bounds a frame length read from a file so a corrupt or hostile
	// header cannot ask for gigabytes.
	maxFrame = chunkSize + 64
)

var (
	ErrWrongPassphrase = errors.New("wrong passphrase, or the backup file is damaged")
	ErrNeedPassphrase  = errors.New("this backup is encrypted; a passphrase is required")
)

// Artifact file names carry how they were sealed: x.sql, x.sql.gz, x.sql.gz.enc.
const (
	gzipSuffix = ".gz"
	encSuffix  = ".enc"
)

func IsEncrypted(name string) bool { return strings.HasSuffix(name, encSuffix) }
func IsCompressed(name string) bool {
	return strings.HasSuffix(strings.TrimSuffix(name, encSuffix), gzipSuffix)
}

// PlainName is the file name with sealing suffixes removed.
func PlainName(name string) string {
	return strings.TrimSuffix(strings.TrimSuffix(name, encSuffix), gzipSuffix)
}

// Encryption is what a backup needs to be encrypted without the passphrase: the
// public key, and the private key wrapped by the passphrase (kept in each file
// so a backup stays restorable without its schedule).
type Encryption struct {
	PublicKey  []byte
	WrappedKey []byte
}

// NewEncryption makes a fresh key pair and wraps its private half with the
// passphrase. The passphrase is not kept anywhere.
func NewEncryption(passphrase string) (*Encryption, error) {
	priv, err := ecdh.X25519().GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}

	salt := make([]byte, saltSize)
	nonce := make([]byte, nonceSize)

	if _, err := rand.Read(salt); err != nil {
		return nil, err
	}

	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}

	aead, err := deriveKey(passphrase, salt)
	if err != nil {
		return nil, err
	}

	wrapped := append(append(salt, nonce...), aead.Seal(nil, nonce, priv.Bytes(), []byte(sealMagic))...)

	return &Encryption{PublicKey: priv.PublicKey().Bytes(), WrappedKey: wrapped}, nil
}

// Seal gzips and/or encrypts src into a new file next to it, removes src, and
// returns the new path. Nothing is done when neither option is on.
func Seal(src string, compress bool, enc *Encryption) (string, error) {
	if !compress && enc == nil {
		return src, nil
	}

	dest := src
	if compress {
		dest += gzipSuffix
	}

	if enc != nil {
		dest += encSuffix
	}

	in, err := os.Open(src)
	if err != nil {
		return "", err
	}

	defer func() { _ = in.Close() }()

	out, err := os.OpenFile(dest, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return "", err
	}

	if err := sealStream(in, out, compress, enc); err != nil {
		_ = out.Close()
		_ = os.Remove(dest)

		return "", err
	}

	if err := out.Close(); err != nil {
		_ = os.Remove(dest)

		return "", err
	}

	return dest, os.Remove(src)
}

func sealStream(in io.Reader, out io.Writer, compress bool, enc *Encryption) error {
	sink := io.WriteCloser(nopCloser{out})

	if enc != nil {
		w, err := newEncryptWriter(out, enc)
		if err != nil {
			return err
		}

		sink = w
	}

	w := sink
	if compress {
		w = gzip.NewWriter(sink)
	}

	if _, err := io.Copy(w, in); err != nil {
		return err
	}

	if compress {
		if err := w.Close(); err != nil {
			return err
		}
	}

	return sink.Close()
}

// Unseal writes the plain artifact to a new file at dest. It decrypts first,
// then gunzips, as the name says. The caller removes dest when done.
func Unseal(src, dest, passphrase string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}

	defer func() { _ = in.Close() }()

	out, err := os.OpenFile(dest, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}

	if err := unsealStream(in, out, IsCompressed(src), IsEncrypted(src), passphrase); err != nil {
		_ = out.Close()
		_ = os.Remove(dest)

		return err
	}

	if err := out.Close(); err != nil {
		_ = os.Remove(dest)

		return err
	}

	return nil
}

func unsealStream(in io.Reader, out io.Writer, compressed, encrypted bool, passphrase string) error {
	r := io.Reader(in)

	if encrypted {
		if passphrase == "" {
			return ErrNeedPassphrase
		}

		dec, err := newDecryptReader(in, passphrase)
		if err != nil {
			return err
		}

		r = dec
	}

	if compressed {
		gz, err := gzip.NewReader(r)
		if err != nil {
			return err
		}

		defer func() { _ = gz.Close() }()

		r = gz
	}

	_, err := io.Copy(out, r)

	return err
}

type nopCloser struct{ io.Writer }

func (nopCloser) Close() error { return nil }

func deriveKey(passphrase string, salt []byte) (cipher.AEAD, error) {
	key, err := scrypt.Key([]byte(passphrase), salt, 1<<15, 8, 1, 32)
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	return cipher.NewGCM(block)
}

// fileAEAD derives a file's frame key from the key agreement. The ephemeral
// public key is the HKDF salt, so each file gets its own key.
func fileAEAD(shared, ephemeralPub []byte) (cipher.AEAD, error) {
	key, err := hkdf.Key(sha256.New, shared, ephemeralPub, "dbo-backup-v2", 32)
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	return cipher.NewGCM(block)
}

// frameNonce is a counter, so every chunk of a file has its own nonce.
func frameNonce(counter uint64) []byte {
	nonce := make([]byte, 12)
	binary.BigEndian.PutUint64(nonce[4:], counter)

	return nonce
}

// encryptWriter seals 1 MiB frames with AES-256-GCM. The last frame is marked
// in its additional data, so cutting a file short fails to decrypt.
type encryptWriter struct {
	out     io.Writer
	aead    cipher.AEAD
	buf     []byte
	counter uint64
}

func newEncryptWriter(out io.Writer, enc *Encryption) (*encryptWriter, error) {
	pub, err := ecdh.X25519().NewPublicKey(enc.PublicKey)
	if err != nil {
		return nil, err
	}

	eph, err := ecdh.X25519().GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}

	shared, err := eph.ECDH(pub)
	if err != nil {
		return nil, err
	}

	aead, err := fileAEAD(shared, eph.PublicKey().Bytes())
	if err != nil {
		return nil, err
	}

	header := append(append([]byte(sealMagic), enc.WrappedKey...), eph.PublicKey().Bytes()...)
	if _, err := out.Write(header); err != nil {
		return nil, err
	}

	return &encryptWriter{out: out, aead: aead, buf: make([]byte, 0, chunkSize)}, nil
}

func (w *encryptWriter) Write(p []byte) (int, error) {
	written := len(p)

	for len(p) > 0 {
		n := min(len(p), chunkSize-len(w.buf))
		w.buf = append(w.buf, p[:n]...)
		p = p[n:]

		// A full buffer is flushed only when more data follows, so Close
		// can always mark the true last frame.
		if len(w.buf) == chunkSize && len(p) > 0 {
			if err := w.flush(false); err != nil {
				return 0, err
			}
		}
	}

	return written, nil
}

func (w *encryptWriter) Close() error { return w.flush(true) }

func (w *encryptWriter) flush(final bool) error {
	last := byte(0)
	if final {
		last = 1
	}

	sealed := w.aead.Seal(nil, frameNonce(w.counter), w.buf, []byte{last})
	w.counter++
	w.buf = w.buf[:0]

	var header [4]byte
	binary.BigEndian.PutUint32(header[:], uint32(len(sealed))) //nolint:gosec // bounded by chunkSize+tag

	if _, err := w.out.Write(header[:]); err != nil {
		return err
	}

	_, err := w.out.Write(sealed)

	return err
}

type decryptReader struct {
	in      *bufio.Reader
	aead    cipher.AEAD
	plain   []byte
	counter uint64
	done    bool
}

func newDecryptReader(in io.Reader, passphrase string) (*decryptReader, error) {
	head := make([]byte, len(sealMagic)+wrappedSize+pubSize)
	if _, err := io.ReadFull(in, head); err != nil || string(head[:len(sealMagic)]) != sealMagic {
		return nil, fmt.Errorf("not an encrypted DBO backup: %w", ErrWrongPassphrase)
	}

	wrapped := head[len(sealMagic) : len(sealMagic)+wrappedSize]
	ephPub := head[len(sealMagic)+wrappedSize:]

	unwrap, err := deriveKey(passphrase, wrapped[:saltSize])
	if err != nil {
		return nil, err
	}

	privBytes, err := unwrap.Open(nil, wrapped[saltSize:saltSize+nonceSize], wrapped[saltSize+nonceSize:], []byte(sealMagic))
	if err != nil {
		return nil, ErrWrongPassphrase
	}

	priv, err := ecdh.X25519().NewPrivateKey(privBytes)
	if err != nil {
		return nil, ErrWrongPassphrase
	}

	peer, err := ecdh.X25519().NewPublicKey(ephPub)
	if err != nil {
		return nil, ErrWrongPassphrase
	}

	shared, err := priv.ECDH(peer)
	if err != nil {
		return nil, ErrWrongPassphrase
	}

	aead, err := fileAEAD(shared, ephPub)
	if err != nil {
		return nil, err
	}

	return &decryptReader{in: bufio.NewReader(in), aead: aead}, nil
}

func (r *decryptReader) Read(p []byte) (int, error) {
	for len(r.plain) == 0 {
		if r.done {
			return 0, io.EOF
		}

		if err := r.nextFrame(); err != nil {
			return 0, err
		}
	}

	n := copy(p, r.plain)
	r.plain = r.plain[n:]

	return n, nil
}

func (r *decryptReader) nextFrame() error {
	var header [4]byte
	if _, err := io.ReadFull(r.in, header[:]); err != nil {
		// A file must end on a frame marked final; a clean EOF here means cut short.
		return ErrWrongPassphrase
	}

	size := binary.BigEndian.Uint32(header[:])
	if size < uint32(r.aead.Overhead()) || size > maxFrame {
		return ErrWrongPassphrase
	}

	sealed := make([]byte, size)
	if _, err := io.ReadFull(r.in, sealed); err != nil {
		return ErrWrongPassphrase
	}

	// The next byte decides whether this frame is the last one.
	_, peekErr := r.in.Peek(1)
	last := byte(0)

	if errors.Is(peekErr, io.EOF) {
		last = 1
	}

	plain, err := r.aead.Open(nil, frameNonce(r.counter), sealed, []byte{last})
	if err != nil {
		return ErrWrongPassphrase
	}

	r.counter++
	r.plain = plain
	r.done = last == 1

	return nil
}

// passphrases hands a restore's passphrase from the request to its job without
// writing it to the job row or the cache, which persist to disk.
var passphrases sync.Map

func StashPassphrase(jobID uint, passphrase string) { passphrases.Store(jobID, passphrase) }

// TakePassphrase returns and forgets the passphrase stashed for a job.
func TakePassphrase(jobID uint) string {
	v, ok := passphrases.LoadAndDelete(jobID)
	if !ok {
		return ""
	}

	s, _ := v.(string)

	return s
}
