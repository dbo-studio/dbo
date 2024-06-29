// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rust_embed::Embed;
use std::env;
use std::io::Write;
use std::os::unix::fs::PermissionsExt;
use std::path::Path;
use tempfile::NamedTempFile;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::runtime::Runtime;
use tokio::task;

#[derive(Embed)]
#[folder = "assets/"]
pub struct Asset;

fn main() {
    let binary_path = extract_binary();

    let rt = Runtime::new().unwrap();
    rt.block_on(async {
        // Spawn a task to run the command in the background
        let handle = task::spawn(async move {
            run_command(binary_path.as_path()).await;
        });

        // Simulate doing other work in the main thread
        for i in 0..5 {
            println!("Main thread working: iteration {}", i);
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }

        // Await the background task to ensure it completes
        handle.await.expect("Background task failed");
    });

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_backend_host])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_backend_host() -> String {
    // return match find_free_port() {
    //     Some(p) => p,
    //     None => 0,
    // };

    return "".into();
}

// fn find_free_port() -> Option<u16> {
//     for port in 5000..=9000 {
//         if let Ok(listener) = TcpListener::bind(("127.0.0.1", port)) {
//             // Immediately drop the listener to free the port
//             drop(listener);
//             return Some(port);
//         }
//     }
//     None
// }

fn extract_binary() -> std::path::PathBuf {
    // Extract the embedded binary to a temporary file
    let binary = Asset::get("/dbo").expect("Failed to get embedded binary");

    let mut file = NamedTempFile::new().expect("Failed to create temporary file");
    file.write_all(&binary.data)
        .expect("Failed to write binary to temporary file");

    // Make the file executable
    let mut perms = file
        .as_file()
        .metadata()
        .expect("Failed to get file metadata")
        .permissions();

    perms.set_mode(0o755);
    file.as_file()
        .set_permissions(perms)
        .expect("Failed to set file permissions");

    file.into_temp_path().to_path_buf()
}

async fn run_command(binary_path: &Path) {
    let mut child = Command::new(binary_path)
        .stdout(std::process::Stdio::piped())
        .spawn()
        .expect("Failed to start command");

    if let Some(stdout) = child.stdout.take() {
        let mut reader = BufReader::new(stdout).lines();
        while let Some(line) = reader.next_line().await.expect("Failed to read line") {
            println!("Command output: {}", line);
        }
    }

    let output = child
        .wait_with_output()
        .await
        .expect("Failed to run command");
    println!("Command finished with status: {}", output.status);
}
