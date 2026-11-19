# Desktop IDE polish

The Tauri app should behave like a desktop IDE: the window, native menus, and keyboard shortcuts are part of the product, not a browser frame around the same UI.

Each item is a gap in the current desktop shell and the change that closes it.

## Window

- **Remember size and position.** `desktop/tauri.conf.json` always opens at 1280×800. Persist bounds (and the screen they were on) and restore them on the next launch.
- **Lower the minimum size.** `minWidth` is 1280, so smaller laptops cannot shrink the window. Let it go down to the width the layout already supports.
- **Stop measuring the macOS traffic lights by hand.** `useSetupDesktop` pads the header by a fixed 88px. Read the safe area from the window instead, and only while the overlay title bar is showing.
- **Give Windows and Linux one title bar.** Overlay title-bar layout runs on macOS only, so the other platforms keep the OS title bar plus the in-app header. Use the same overlay (or hide the OS title) everywhere.
- **Own zoom.** There is no View zoom command, so trackpad pinch and `⌘+` / `⌘-` scale the whole webview. Add Zoom In, Zoom Out, and Actual Size on the View menu, and ignore pinch unless that zoom is what the user asked for.

## Menus and shortcuts

- **Build the native menu from the app language.** Labels in `desktop/src/menu.rs` and `desktop/src/tray.rs` are fixed English. Emit them from the same locale strings as the React UI.
- **Drop the duplicate Connection menu.** New Connection and Refresh Tree already live under File and View.
- **Give `⌘R` one meaning.** The View menu accelerator refreshes the tree and `reloadTab` refreshes the grid. Keep the menu item without an accelerator, or route it to whichever surface is focused.
- **Put Save on the File menu.** File can open a `.sql` file and close a tab, but it cannot save the editor. Add Save and Save As with `⌘S` / `⌘⇧S`, writing back to the file the tab was opened from.
- **List recent files.** Opened `.sql` paths are not remembered. Add an Open Recent submenu and reopen the last set of editor tabs on launch.
- **Mirror IDE commands in View.** Command palette (`⌘K`), toggle sidebar, and toggle the bottom panel exist only as in-app shortcuts. Put them on the View menu so the menu bar matches the keymap.
- **Confirm quit when work is unsaved.** Close-to-tray asks only when a job is running (`tray://confirm-quit`). `⌘Q` and a real close drop dirty SQL and unsaved grid edits. Prompt when the editor or the grid has changes.

## Input

- **Allow selecting text.** Production desktop calls `preventDefault` on `selectstart` for everything except inputs and textareas (`useSetupDesktop`). Skip that for the editor, result grids, and any selectable text. Keep blocking only the webview's own context menu.
- **Do not assume "keep running in the background" before settings load.** `TrayState.keep_running` starts as `true`, so the first close can hide the window even when the user turned that off. Default to quit until the frontend has pushed the saved setting.

## Files and identity

- **Keep the path of an opened `.sql` file.** `readSqlFile` returns only the text, and the new tab stores that text with no path. Remember the path on the tab so Save writes back to it, the tab label is the filename, and a dirty tab shows a dot.
- **Put the workspace in the window title.** The title stays `DBO`. Set it to the connection and the active tab (and a dirty marker), the way an IDE names its window.
- **Register database files with the OS.** The bundle only associates `.sql`, while a dropped `.sqlite` / `.db` file already opens as a connection. Add those extensions so double-click and Open With work the same way.
- **Say when a dropped file cannot be opened.** Anything that is not `.sql` or a database path is ignored. Show an error instead of doing nothing.
- **Cycle tabs from the keyboard.** There is no next/previous tab shortcut or Window menu item. Add `⌘⌥→` / `⌘⌥←` (and the matching menu items) to move between open tabs.
- **Reopen the tab you just closed.** There is no reopen-closed-tab command. Keep a short stack of closed editor tabs and restore the last one with `⌘⇧T`.
- **Add Open Database to File.** File → Open only accepts `.sql`, while `pickDatabaseFile` already knows `.db`, `.sqlite`, `.sqlite3`, and `.db3`. Put that picker on the File menu.
- **Let the OS open a database file.** `is_sql_file` drops every path from argv, the second instance, and macOS `RunEvent::Opened` unless it ends in `.sql`. Pass database paths through to `openDatabaseFile` the same way a drop does.
- **Reveal the file.** There is no Reveal in Finder / Show in Explorer for the SQL file of the active tab or the SQLite file of the current connection. Add it on the File menu and the tab context menu.
- **Disable menu items that cannot run.** New Query Tab, Close Tab, and Refresh stay enabled with no connection and no tab. Grey them out from the frontend when there is nothing for them to do.

## Process

- **Show a boot failure that started hidden.** `--minimized` hides the window before the sidecar is up. If the sidecar fails, the error screen is on a hidden window. Show the window when startup fails.
- **Write sidecar output to the log file.** Sidecar stdout and stderr only go to the process terminal. Append them to the log `Show Logs` opens, so a crash is visible from the app.
- **Hold the port until the sidecar listens.** `find_free_port` binds `127.0.0.1:0` and then drops the socket before `dbo-bin` starts. Keep that socket, or retry bind inside the sidecar, so another process cannot take the port in between.
- **Kill only this app's sidecar on Windows.** Cleanup runs `taskkill /IM dbo-bin.exe`, which stops every process with that name. Kill the child pid this instance spawned.
- **Do not force production mode in `tauri dev`.** `setup_environment` always sets `APP_ENV=production`. Set production only for a packaged build so dev keeps dev logging and errors.
- **Open the thing a notification is about.** The notification plugin has no click callback, so a click only focuses the window (`announce.ts`). Focus the finished job, the tab, or the backup the notification refers to.
- **Make the Linux tray usable with one button.** The menu is right-click only and a left click shows the window. Many Linux panels only send one kind of click. Open the menu on that click and put Open DBO on the menu, which is already there.
