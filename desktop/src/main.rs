// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{env, net::TcpListener};
use tauri::{App, Manager, WindowEvent};
use tauri_plugin_decorum::WebviewWindowExt;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

fn main() {
    let _ = fix_path_env::fix();

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
        .invoke_handler(tauri::generate_handler![get_backend_host])
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();
            main_window.create_overlay_titlebar().unwrap();

            #[cfg(target_os = "macos")]
            {
                main_window.set_traffic_lights_inset(12.0, 16.0).unwrap();
                main_window
                    .clone()
                    .on_window_event(move |event| match event {
                        WindowEvent::Resized { .. } => {
                            main_window.set_traffic_lights_inset(12.0, 16.0).unwrap();
                        }
                        _ => {}
                    });
            }

            env::set_var("APP_ENV", "production");
            let port = find_free_port();
            env::set_var("APP_PORT", port.to_string());
            run_server(app);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_backend_host() -> String {
    return String::from(
        "http://127.0.0.1:".to_string()
            + &env::var("APP_PORT").unwrap().to_string()
            + "/api".into(),
    )
    .to_string();
}

fn find_free_port() -> u16 {
    let default = 5124;
    match TcpListener::bind("127.0.0.1:0") {
        Ok(listener) => {
            if let Ok(addr) = listener.local_addr() {
                return addr.port();
            } else {
                return default;
            }
        }
        Err(_) => {}
    }

    return default;
}

fn run_server(app: &mut App) {
    // Try to create the sidecar command
    let sidecar_command = match app.shell().sidecar("dbo-bin") {
        Ok(command) => command,
        Err(e) => {
            eprintln!("Failed to create sidecar command: {}", e);
            return;
        }
    };

    // Spawn the sidecar process
    let (mut rx, mut child) = match sidecar_command.spawn() {
        Ok((rx, child)) => (rx, child),
        Err(e) => {
            eprintln!("Failed to spawn sidecar process: {}", e);
            return;
        }
    };

    // Handle the sidecar process asynchronously
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    println!("Received message: {}", line);

                    // Try writing to the child's stdin
                    if let Err(e) = child.write(b"message from Rust\n") {
                        eprintln!("Failed to write to child stdin: {}", e);
                    }
                }
                CommandEvent::Stderr(err_bytes) => {
                    let error_line = String::from_utf8_lossy(&err_bytes);
                    eprintln!("Error from sidecar: {}", error_line);
                }
                other_event => {
                    println!("Received other event: {:?}", other_event);
                }
            }
        }

        // Ensure the child process is terminated properly
        if let Err(e) = child.kill() {
            eprintln!("Failed to terminate sidecar process: {}", e);
        }
    });
}
