//go:build !windows

package helper

import "syscall"

// FreeDiskBytes returns the bytes available to unprivileged users on the
// filesystem holding path; ok is false when it cannot be determined.
func FreeDiskBytes(path string) (free uint64, ok bool) {
	var st syscall.Statfs_t
	if err := syscall.Statfs(path, &st); err != nil {
		return 0, false
	}

	return uint64(st.Bavail) * uint64(st.Bsize), true //nolint:gosec // block counts are never negative
}
