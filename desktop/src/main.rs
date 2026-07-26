#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::net::TcpListener;
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Manager, RunEvent};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

#[cfg(target_os = "macos")]
use tauri_plugin_decorum::WebviewWindowExt;

type SidecarChild = Arc<Mutex<Option<CommandChild>>>;

const DEFAULT_PORT: u16 = 5124;

/// Vertically centers traffic lights in the ~56px app header (8 + 40 + 8).
#[cfg(target_os = "macos")]
const TRAFFIC_LIGHT_INSET: (f32, f32) = (12.0, 20.0);

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

fn setup_environment() {
    let port = find_free_port();
    unsafe {
        env::set_var("APP_ENV", "production");
        env::set_var("APP_PORT", port.to_string());
        env::set_var("APP_CLIENT", "desktop");
    }
}

fn start_backend_server(app: &tauri::App) {
    let app_handle = app.handle().clone();
    tauri::async_runtime::spawn(async move {
        run_sidecar(app_handle).await;
    });
}

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

fn find_free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .ok()
        .and_then(|listener| listener.local_addr().ok())
        .map(|addr| addr.port())
        .unwrap_or(DEFAULT_PORT)
}
