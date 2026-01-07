// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::net::TcpListener;
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Manager, RunEvent};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

#[cfg(target_os = "macos")]
use tauri_plugin_decorum::WebviewWindowExt;

// =============================================================================
// Types
// =============================================================================

type SidecarChild = Arc<Mutex<Option<CommandChild>>>;

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_PORT: u16 = 5124;

// =============================================================================
// Main
// =============================================================================

fn main() {
    let _ = fix_path_env::fix();

    let sidecar_child: SidecarChild = Arc::new(Mutex::new(None));
    let sidecar_child_for_cleanup = sidecar_child.clone();

    tauri::Builder::default()
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
        .invoke_handler(tauri::generate_handler![get_backend_host])
        .setup(|app| {
            setup_macos_window(app)?;
            setup_environment();
            start_backend_server(app);
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |_, event| {
            if let RunEvent::Exit = event {
                cleanup_sidecar(&sidecar_child_for_cleanup);
            }
        });
}

// =============================================================================
// Commands
// =============================================================================

#[tauri::command]
fn get_backend_host() -> String {
    let port = env::var("APP_PORT").unwrap_or_else(|_| DEFAULT_PORT.to_string());
    format!("http://127.0.0.1:{}/api", port)
}

// =============================================================================
// Setup Functions
// =============================================================================

#[cfg(target_os = "macos")]
fn setup_macos_window(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let main_window = app.get_webview_window("main").unwrap();
    main_window.create_overlay_titlebar().unwrap();
    main_window.set_traffic_lights_inset(12.0, 16.0).unwrap();
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn setup_macos_window(_app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}

fn setup_environment() {
    let port = find_free_port();
    unsafe {
        env::set_var("APP_ENV", "production");
        env::set_var("APP_PORT", port.to_string());
    }
}

fn start_backend_server(app: &tauri::App) {
    let app_handle = app.handle().clone();
    tauri::async_runtime::spawn(async move {
        run_sidecar(app_handle).await;
    });
}

// =============================================================================
// Sidecar Management
// =============================================================================

async fn run_sidecar(app: AppHandle) {
    let sidecar_command = match app.shell().sidecar("dbo-bin") {
        Ok(cmd) => cmd,
        Err(e) => {
            eprintln!("Failed to create sidecar command: {}", e);
            return;
        }
    };

    let (mut rx, child) = match sidecar_command.spawn() {
        Ok(result) => result,
        Err(e) => {
            eprintln!("Failed to spawn sidecar process: {}", e);
            return;
        }
    };

    // Store child in app state for cleanup on exit
    let sidecar_state = app.state::<SidecarChild>();
    if let Ok(mut child_opt) = sidecar_state.lock() {
        *child_opt = Some(child);
    }

    let sidecar_state_for_events = sidecar_state.inner().clone();

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(data) => {
                    println!("Sidecar: {}", String::from_utf8_lossy(&data));
                }
                CommandEvent::Stderr(data) => {
                    eprintln!("Sidecar error: {}", String::from_utf8_lossy(&data));
                }
                CommandEvent::Terminated(status) => {
                    eprintln!("Sidecar terminated unexpectedly: {:?}", status);
                    if let Ok(mut child_opt) = sidecar_state_for_events.lock() {
                        child_opt.take();
                    }
                    break;
                }
                CommandEvent::Error(error) => {
                    eprintln!("Sidecar error event: {}", error);
                }
                _ => {}
            }
        }
    });
}

fn cleanup_sidecar(sidecar_child: &SidecarChild) {
    println!("Application exiting, cleaning up sidecar...");

    if let Ok(mut child_opt) = sidecar_child.lock() {
        if let Some(child) = child_opt.take() {
            match child.kill() {
                Ok(_) => println!("Sidecar process terminated successfully"),
                Err(e) => eprintln!("Failed to terminate sidecar: {}", e),
            }
        }
    }
}

// =============================================================================
// Utility Functions
// =============================================================================

fn find_free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .ok()
        .and_then(|listener| listener.local_addr().ok())
        .map(|addr| addr.port())
        .unwrap_or(DEFAULT_PORT)
}
