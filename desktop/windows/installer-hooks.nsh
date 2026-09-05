; Kill the Go sidecar before file replacement — Tauri's CheckIfAppIsRunning
; (which runs immediately after this hook) handles the main binary with a
; user-facing dialog, but does not know about the sidecar.

!macro NSIS_HOOK_PREINSTALL
  DetailPrint "Stopping DBO sidecar..."
  nsis_tauri_utils::KillProcessCurrentUser "dbo-bin.exe"
  Pop $R0
  Sleep 2000
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DetailPrint "Stopping DBO sidecar..."
  nsis_tauri_utils::KillProcessCurrentUser "dbo-bin.exe"
  Pop $R0
  Sleep 2000
!macroend
