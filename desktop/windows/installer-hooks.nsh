; Kill the Go sidecar before file replacement — Tauri's CheckIfAppIsRunning
; (which runs immediately after this hook) handles the main binary with a
; user-facing dialog, but does not know about the sidecar.

!macro NSIS_HOOK_PREINSTALL
  DetailPrint "Stopping DBO sidecar..."
  nsis_tauri_utils::KillProcessCurrentUser "dbo-bin.exe"
  Pop $R0
  Sleep 2000
!macroend

; Desktop builds before ~1.1.2 shipped a PWA service worker that cached stale UI
; in WebView2. Wipe EBWebView after install/update so the next launch loads fresh assets.
!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "Clearing legacy WebView2 cache..."
  RMDir /r "$LOCALAPPDATA\com.dbostudio.dev\EBWebView"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DetailPrint "Stopping DBO sidecar..."
  nsis_tauri_utils::KillProcessCurrentUser "dbo-bin.exe"
  Pop $R0
  Sleep 2000
!macroend
