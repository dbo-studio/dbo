// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{env, net::TcpListener};

use tauri::api::process::{Command, CommandEvent};

fn main() {
    match find_free_port() {
        Some(p) => {
            env::set_var("APP_ENV", "production");
            env::set_var("APP_PORT", p.to_string());
            run_server();
            tauri::Builder::default()
                .invoke_handler(tauri::generate_handler![get_backend_host])
                .run(tauri::generate_context!())
                .expect("error while running tauri application");
        }
        None => {}
    };
}

#[tauri::command]
fn get_backend_host() -> String {
    return String::from(
        "http://localhost:".to_string() + &env::var("APP_PORT").unwrap().to_string(),
    )
    .to_string();
}

fn find_free_port() -> Option<u16> {
    for port in 5000..=9000 {
        if let Ok(listener) = TcpListener::bind(("127.0.0.1", port)) {
            // Immediately drop the listener to free the port
            drop(listener);
            return Some(port);
        }
    }
    None
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
