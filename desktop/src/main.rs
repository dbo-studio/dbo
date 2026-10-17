#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod menu;

use std::env;
use std::fs;
use std::net::TcpListener;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Emitter, Manager, RunEvent, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

#[cfg(target_os = "macos")]
use tauri_plugin_decorum::WebviewWindowExt;

type SidecarChild = Arc<Mutex<Option<CommandChild>>>;
type SidecarStopping = Arc<AtomicBool>;
type SidecarEventsHandle = Arc<Mutex<Option<tauri::async_runtime::JoinHandle<()>>>>;
type PendingOpenFiles = Arc<Mutex<Vec<String>>>;

const DEFAULT_PORT: u16 = 5124;
pub const SIDECAR_FAILED_EVENT: &str = "sidecar://failed";
const OPEN_FILES_EVENT: &str = "file://open";
const MAX_SQL_FILE_BYTES: u64 = 50 * 1024 * 1024;

/// Vertically centers traffic lights in the ~56px app header (8 + 40 + 8).
#[cfg(target_os = "macos")]
const TRAFFIC_LIGHT_INSET: (f32, f32) = (12.0, 20.0);

#[derive(Clone, serde::Serialize)]
struct SidecarFailedPayload {
    reason: String,
}

fn main() {
    let _ = fix_path_env::fix();

    let sidecar_child: SidecarChild = Arc::new(Mutex::new(None));
    let sidecar_stopping: SidecarStopping = Arc::new(AtomicBool::new(false));
    let sidecar_events: SidecarEventsHandle = Arc::new(Mutex::new(None));
    let sidecar_child_for_cleanup = sidecar_child.clone();
    let sidecar_stopping_for_cleanup = sidecar_stopping.clone();
    let sidecar_events_for_cleanup = sidecar_events.clone();
    // Files passed at launch (Windows/Linux argv); macOS delivers them via RunEvent::Opened.
    let pending_open_files: PendingOpenFiles =
        Arc::new(Mutex::new(env::args().skip(1).filter(|a| is_sql_file(a)).collect()));

    let mut builder = tauri::Builder::default()
        // Must be registered first. Forwards files from a second launch to this instance.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            queue_open_files(app, argv.into_iter().skip(1).filter(|a| is_sql_file(a)).collect());
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_decorum::init())
        .manage(sidecar_child.clone())
        .manage(sidecar_stopping.clone())
        .manage(sidecar_events.clone())
        .manage(pending_open_files.clone())
        .invoke_handler(tauri::generate_handler![
            get_backend_host,
            restart_backend,
            take_pending_open_files,
            read_sql_file
        ]);

    #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android", target_os = "windows"))]
    {
        builder = builder.plugin(tauri_plugin_biometry::init());
    }

    builder
        .setup(|app| {
            setup_macos_window(app)?;
            menu::setup_menu(app)?;
            setup_environment();
            start_backend_server(app.handle());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |_app, event| {
            #[cfg(any(target_os = "macos", target_os = "ios"))]
            if let RunEvent::Opened { urls } = &event {
                let paths: Vec<String> = urls
                    .iter()
                    .filter_map(|u| u.to_file_path().ok())
                    .map(|p| p.to_string_lossy().into_owned())
                    .filter(|p| is_sql_file(p))
                    .collect();
                queue_open_files(_app, paths);
            }

            if matches!(event, RunEvent::ExitRequested { .. } | RunEvent::Exit) {
                cleanup_sidecar(
                    &sidecar_child_for_cleanup,
                    &sidecar_stopping_for_cleanup,
                    &sidecar_events_for_cleanup,
                );
            }
        });
}

#[cfg(target_os = "macos")]
fn setup_macos_window(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let main_window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;
    // Decorum owns overlay titlebar + fullscreen events the frontend listens for.
    main_window.create_overlay_titlebar()?;
    apply_traffic_light_inset(&main_window)?;

    // Decorum resizes the AppKit titlebar container. On blur/focus AppKit relayouts
    // that view and the buttons can clip out of sight unless we re-apply the inset.
    let window_for_events = main_window.clone();
    main_window.on_window_event(move |event| {
        if let tauri::WindowEvent::Focused(_) = event {
            let _ = apply_traffic_light_inset(&window_for_events);
        }
    });

    Ok(())
}

#[cfg(target_os = "macos")]
fn apply_traffic_light_inset(
    window: &tauri::WebviewWindow,
) -> Result<(), Box<dyn std::error::Error>> {
    window.set_traffic_lights_inset(TRAFFIC_LIGHT_INSET.0, TRAFFIC_LIGHT_INSET.1)?;
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn setup_macos_window(_app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}

#[tauri::command]
fn get_backend_host() -> String {
    let port = env::var("APP_PORT").unwrap_or_else(|_| DEFAULT_PORT.to_string());
    format!("http://127.0.0.1:{}/api", port)
}

#[tauri::command]
fn restart_backend(
    app: AppHandle,
    sidecar: State<'_, SidecarChild>,
    stopping: State<'_, SidecarStopping>,
    events: State<'_, SidecarEventsHandle>,
) -> Result<(), String> {
    cleanup_sidecar(&sidecar, &stopping, &events);
    start_backend_server(&app);
    Ok(())
}

fn queue_open_files(app: &AppHandle, paths: Vec<String>) {
    if paths.is_empty() {
        return;
    }
    if let Ok(mut pending) = app.state::<PendingOpenFiles>().lock() {
        pending.extend(paths);
    }
    let _ = app.emit(OPEN_FILES_EVENT, ());
}

fn is_sql_file(path: &str) -> bool {
    Path::new(path)
        .extension()
        .is_some_and(|ext| ext.eq_ignore_ascii_case("sql"))
}

#[tauri::command]
fn take_pending_open_files(pending: State<'_, PendingOpenFiles>) -> Vec<String> {
    pending
        .lock()
        .map(|mut files| std::mem::take(&mut *files))
        .unwrap_or_default()
}

#[tauri::command]
fn read_sql_file(path: String) -> Result<String, String> {
    if !is_sql_file(&path) {
        return Err("Not a .sql file".into());
    }
    let size = fs::metadata(&path).map_err(|e| e.to_string())?.len();
    if size > MAX_SQL_FILE_BYTES {
        return Err("File is too large".into());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

fn setup_environment() {
    let port = find_free_port();
    unsafe {
        env::set_var("APP_ENV", "production");
        env::set_var("APP_PORT", port.to_string());
        env::set_var("APP_CLIENT", "desktop");
    }
}

fn start_backend_server(app: &AppHandle) {
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        run_sidecar(app_handle).await;
    });
}

fn emit_sidecar_failed(app: &AppHandle, reason: impl Into<String>) {
    let _ = app.emit(
        SIDECAR_FAILED_EVENT,
        SidecarFailedPayload {
            reason: reason.into(),
        },
    );
}

async fn run_sidecar(app: AppHandle) {
    let sidecar_command = match app.shell().sidecar("dbo-bin") {
        Ok(cmd) => cmd,
        Err(e) => {
            let reason = format!("Failed to create sidecar command: {e}");
            eprintln!("{reason}");
            emit_sidecar_failed(&app, reason);
            return;
        }
    };

    let (mut rx, child) = match sidecar_command.spawn() {
        Ok(result) => result,
        Err(e) => {
            let reason = format!("Failed to spawn sidecar process: {e}");
            eprintln!("{reason}");
            emit_sidecar_failed(&app, reason);
            return;
        }
    };

    let sidecar_state = app.state::<SidecarChild>();
    if let Ok(mut child_opt) = sidecar_state.lock() {
        *child_opt = Some(child);
    }

    let sidecar_state_for_events = sidecar_state.inner().clone();
    let stopping = app.state::<SidecarStopping>().inner().clone();
    let events_handle = app.state::<SidecarEventsHandle>().inner().clone();

    let event_task = tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(data) => {
                    println!("Sidecar: {}", String::from_utf8_lossy(&data));
                }
                CommandEvent::Stderr(data) => {
                    eprintln!("Sidecar error: {}", String::from_utf8_lossy(&data));
                }
                CommandEvent::Terminated(status) => {
                    if let Ok(mut child_opt) = sidecar_state_for_events.lock() {
                        child_opt.take();
                    }
                    let intentional = stopping.swap(false, Ordering::SeqCst);
                    if !intentional {
                        let reason = format!("Sidecar terminated unexpectedly: {status:?}");
                        eprintln!("{reason}");
                        emit_sidecar_failed(&app, reason);
                    }
                    break;
                }
                CommandEvent::Error(error) => {
                    if stopping.load(Ordering::SeqCst) {
                        continue;
                    }
                    let reason = format!("Sidecar error event: {error}");
                    eprintln!("{reason}");
                    emit_sidecar_failed(&app, reason);
                }
                _ => {}
            }
        }
    });

    if let Ok(mut handle_opt) = events_handle.lock() {
        *handle_opt = Some(event_task);
    };
}

fn cleanup_sidecar(
    sidecar_child: &SidecarChild,
    stopping: &SidecarStopping,
    events_handle: &SidecarEventsHandle,
) {
    if stopping.swap(true, Ordering::SeqCst) {
        return;
    }

    println!("Cleaning up sidecar...");

    if let Ok(mut handle_opt) = events_handle.lock() {
        if let Some(handle) = handle_opt.take() {
            handle.abort();
        }
    }

    if let Ok(mut child_opt) = sidecar_child.lock() {
        if let Some(child) = child_opt.take() {
            if let Err(e) = child.kill() {
                eprintln!("Failed to terminate sidecar: {e}");
            } else {
                println!("Sidecar process terminated successfully");
            }
        }
    }

    #[cfg(windows)]
    force_kill_sidecar_process();
}

#[cfg(windows)]
fn force_kill_sidecar_process() {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let _ = Command::new("taskkill")
        .args(["/F", "/IM", "dbo-bin.exe"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
}

fn find_free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .ok()
        .and_then(|listener| listener.local_addr().ok())
        .map(|addr| addr.port())
        .unwrap_or(DEFAULT_PORT)
}
