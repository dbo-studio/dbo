// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{env, net::TcpListener};

use tauri::api::process::{Command, CommandEvent};

fn main() {
    env::set_var("APP_ENV", "production");
    let port = find_free_port();
    env::set_var("APP_PORT", port.to_string());
    run_server();
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_backend_host])
        .plugin(tauri_plugin_window_state::Builder::default().build())
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

fn run_server() {
    let (mut rx, mut child) = Command::new_sidecar("dbo")
        .expect("failed to create `my-sidecar` binary command")
        .spawn()
        .expect("Failed to spawn sidecar");

    tauri::async_runtime::spawn(async move {
        // read events such as stdout
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(line) = event {
                println!("message {}", line);
                // write to stdin
                child.write("message from Rust\n".as_bytes()).unwrap();
            }
        }
    });
}