// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{env, net::TcpListener};
use tauri::App;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

fn main() {
    let _ = fix_path_env::fix();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![get_backend_host])
        .setup(|_app| {
            env::set_var("APP_ENV", "production");
            let port = find_free_port();
            env::set_var("APP_PORT", port.to_string());
            run_server(_app);

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
    // let (mut rx, mut child) = Command::new_sidecar("dbo-bin")
    //     .expect("failed to create `dbo-bin` binary command")
    //     .spawn()
    //     .expect("Failed to spawn sidecar");

    // tauri::async_runtime::spawn(async move {
    //     while let Some(event) = rx.recv().await {
    //         if let CommandEvent::Stdout(line) = event {
    //             println!("Received message: {} ", line);
    //             if let Err(e) = child.write("message from Rust\n".as_bytes()) {
    //                 println!("Failed to write to child stdin: {}", e);
    //             }
    //         } else {
    //             println!("Received non-stdout event: {:?} ", event);
    //         }
    //     }
    // });

    let sidecar_command = app.shell().sidecar("dbo-bin").unwrap();
    let (mut rx, mut child) = sidecar_command.spawn().expect("Failed to spawn sidecar");

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(line_bytes) = event {
                let line = String::from_utf8_lossy(&line_bytes);
                println!("Received message: {} ", line);
                if let Err(e) = child.write("message from Rust\n".as_bytes()) {
                    println!("Failed to write to child stdin: {}", e);
                }
            } else {
                println!("Received non-stdout event: {:?} ", event);
            }
        }
    });
}
