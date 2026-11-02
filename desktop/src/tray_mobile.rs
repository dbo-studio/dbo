//! Phones have no tray: the same surface as `tray.rs`, doing nothing, so the shared command list still builds.

use tauri::AppHandle;

pub struct TrayState;

impl TrayState {
    pub fn new() -> Self {
        Self
    }
}

pub fn setup(_app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}

pub fn hide_instead_of_close(_window: &tauri::Window) -> bool {
    false
}

#[allow(dead_code)]
pub fn show_main(_app: &AppHandle) {}

#[tauri::command]
pub fn set_keep_running(_enabled: bool) {}

#[tauri::command]
pub fn update_tray_status(_running_jobs: u32, _mcp: String) {}

#[tauri::command]
pub fn quit_app(_app: AppHandle) {}
