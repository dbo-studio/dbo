// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rust_embed::RustEmbed;
use std::env;
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(RustEmbed)]
#[folder = "assets/"]
struct Asset;

fn main() {
    match write_embedded_binary() {
        Ok(binary_path) => {
            // Run the binary and print its outputs
            if let Err(e) = run_binary(&binary_path) {
                println!("Failed to execute command: {}", e);
            } else {
                println!("run success")
            }
        }
        Err(e) => {
            println!("Failed to write embedded binary: {}", e);
        }
    }

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

fn write_embedded_binary() -> Result<PathBuf, std::io::Error> {
    // Load the binary data from embedded assets
    let embedded_file = Asset::get("dbo").expect("Binary not found in assets");
    let binary_data = embedded_file.data;

    // Create a temporary directory
    let temp_dir = env::temp_dir();
    let binary_path = temp_dir.join("dbo");

    // Write the embedded binary to the temporary file
    let mut file = File::create(&binary_path)?;
    file.write_all(&binary_data)?;

    // Make the file executable (needed for Unix-based systems)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = file.metadata()?.permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&binary_path, perms)?;
    }

    Ok(binary_path)
}

fn run_binary(binary_path: &Path) -> Result<(), std::io::Error> {
    // Execute the command and capture its output
    let mut proc_handle = Command::new(binary_path)
        .stdout(std::process::Stdio::piped())
        .spawn()
        .unwrap();

    // let x = proc_handle.wait();

    let mut output_buffer = String::new();
    let mut stdout_handle = proc_handle
        .stdout
        .unwrap()
        .read_to_string(&mut output_buffer);

    println!("output result {}", output_buffer);

    // Print stdout and stderr
    // let stdout = String::from_utf8_lossy(&output.stdout);
    // let stderr = String::from_utf8_lossy(&output.stderr);

    // if output.status.success() {
    //     println!("Command executed successfully:\n{}", stdout);
    // } else {
    //     println!("Command failed with status {}:\n{}", output.status, stderr);
    // }

    Ok(())
}
