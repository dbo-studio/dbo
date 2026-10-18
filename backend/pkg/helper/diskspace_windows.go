//go:build windows

package helper

// FreeDiskBytes is not measured on Windows, so the preflight check is skipped.
func FreeDiskBytes(_ string) (free uint64, ok bool) {
	return 0, false
}
