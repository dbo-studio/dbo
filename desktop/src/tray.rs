//! System tray and background running: closing the window can hide DBO instead of quitting it, so the Go
//! sidecar (and with it the MCP server and any running job) stays up until the user quits from the tray.

use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Mutex;

use tauri::menu::{MenuBuilder, MenuItem, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, Wry};

/// The window was hidden to the tray; the frontend shows its one-time hint.
pub const HIDDEN_EVENT: &str = "tray://hidden";
/// Quit was asked from the tray while jobs run; the frontend confirms, then calls `quit_app`.
pub const CONFIRM_QUIT_EVENT: &str = "tray://confirm-quit";

pub struct TrayState {
    /// The "keep running in the background" setting; the frontend owns it and pushes changes here.
    keep_running: AtomicBool,
    running_jobs: AtomicU32,
    mcp_item: Mutex<Option<MenuItem<Wry>>>,
    jobs_item: Mutex<Option<MenuItem<Wry>>>,
}

impl TrayState {
    pub fn new() -> Self {
        Self {
            keep_running: AtomicBool::new(true),
            running_jobs: AtomicU32::new(0),
            mcp_item: Mutex::new(None),
            jobs_item: Mutex::new(None),
        }
    }

    pub fn keep_running(&self) -> bool {
        self.keep_running.load(Ordering::SeqCst)
    }
}

fn jobs_label(count: u32) -> String {
    match count {
        0 => "No running jobs".to_string(),
        1 => "1 running job".to_string(),
        n => format!("{n} running jobs"),
    }
}

/// Brings the main window back from the tray (or from behind other windows).
pub fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

pub fn setup(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let open = MenuItemBuilder::with_id("open", "Open DBO").build(app)?;
    let mcp = MenuItemBuilder::with_id("mcp", "MCP: starting").enabled(false).build(app)?;
    let jobs = MenuItemBuilder::with_id("jobs", jobs_label(0)).enabled(false).build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit DBO").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[&open, &mcp, &jobs])
        .separator()
        .item(&quit)
        .build()?;

    let state = app.state::<TrayState>();
    *state.mcp_item.lock().unwrap() = Some(mcp);
    *state.jobs_item.lock().unwrap() = Some(jobs);

    let mut tray = TrayIconBuilder::with_id("main")
        .tooltip("DBO Studio")
        .menu(&menu)
        // The menu opens on right click; a left click brings the window back.
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main(app),
            "quit" => request_quit(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    tray.build(app)?;

    Ok(())
}

/// Close-to-tray: with the setting on, the window hides and DBO keeps running. Returns whether the close was stopped.
pub fn hide_instead_of_close(window: &tauri::Window) -> bool {
    let app = window.app_handle();
    if !app.state::<TrayState>().keep_running() {
        return false;
    }

    let _ = window.hide();
    let _ = app.emit(HIDDEN_EVENT, ());

    true
}

fn request_quit(app: &AppHandle) {
    let running = app.state::<TrayState>().running_jobs.load(Ordering::SeqCst);
    if running == 0 {
        app.exit(0);

        return;
    }

    // The confirmation lives in the app, so the window has to be there to show it.
    show_main(app);
    let _ = app.emit(CONFIRM_QUIT_EVENT, running);
}

#[tauri::command]
pub fn set_keep_running(enabled: bool, state: State<'_, TrayState>) {
    state.keep_running.store(enabled, Ordering::SeqCst);
}

/// The frontend stays alive while the window is hidden, so it reports what the tray menu shows.
#[tauri::command]
pub fn update_tray_status(running_jobs: u32, mcp: String, state: State<'_, TrayState>) {
    state.running_jobs.store(running_jobs, Ordering::SeqCst);

    if let Some(item) = state.jobs_item.lock().unwrap().as_ref() {
        let _ = item.set_text(jobs_label(running_jobs));
    }

    if let Some(item) = state.mcp_item.lock().unwrap().as_ref() {
        let _ = item.set_text(format!("MCP: {mcp}"));
    }
}

/// Quit for real: the exit request runs the sidecar cleanup.
#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}
