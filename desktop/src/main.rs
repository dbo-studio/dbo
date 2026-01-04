// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{env, net::TcpListener, net::TcpStream, time::Duration};
use tauri::{AppHandle, Manager};
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
        .plugin(tauri_plugin_decorum::init())
        .invoke_handler(tauri::generate_handler![get_backend_host])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                let main_window = app.get_webview_window("main").unwrap();
                main_window.create_overlay_titlebar().unwrap();

                main_window.set_traffic_lights_inset(12.0, 16.0).unwrap();
            }

            unsafe { env::set_var("APP_ENV", "production") };
            let port = find_free_port();
            unsafe { env::set_var("APP_PORT", port.to_string()) };

            // Start the server
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                run_server(app_handle).await;
            });

            // Wait for the server to be ready before showing the window
            wait_for_server_ready(port);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_backend_host() -> String {
    return "http://127.0.0.1:".to_string() + &env::var("APP_PORT").unwrap().to_string() + "/api";
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

async fn run_server(app: AppHandle) {
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

fn wait_for_server_ready(port: u16) {
    let max_attempts = 60; // Maximum 30 seconds (60 * 500ms)
    let check_interval = Duration::from_millis(500);

    for attempt in 1..=max_attempts {
        // Try to connect to the server port
        match TcpStream::connect(format!("127.0.0.1:{}", port)) {
            Ok(_) => {
                // Server is ready, but wait a bit more to ensure it's fully initialized
                std::thread::sleep(Duration::from_millis(200));
                println!("Server is ready on port {}", port);
                return;
            }
            Err(_) => {
                if attempt < max_attempts {
                    std::thread::sleep(check_interval);
                } else {
                    eprintln!("Server failed to start within {} seconds", max_attempts / 2);
                }
            }
        }
    }
}
