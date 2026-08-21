use tauri::{
    menu::{Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    Emitter, Manager, Runtime,
};

#[cfg(target_os = "macos")]
use tauri::menu::AboutMetadata;

#[cfg(not(target_os = "macos"))]
use tauri::menu::PredefinedMenuItem;

pub const MENU_ACTION_EVENT: &str = "menu://action";

#[derive(Clone, serde::Serialize)]
pub struct MenuActionPayload {
    pub id: String,
}

pub fn setup_menu<R: Runtime>(app: &tauri::App<R>) -> tauri::Result<()> {
    let handle = app.handle();
    let menu = build_menu(handle)?;
    app.set_menu(menu)?;

    let handle_for_events = handle.clone();
    app.on_menu_event(move |_app, event| {
        let raw_id = event.id().as_ref();
        if let Some(id) = normalize_menu_action(raw_id) {
            let _ = handle_for_events.emit(
                MENU_ACTION_EVENT,
                MenuActionPayload {
                    id: id.to_string(),
                },
            );
        }
    });

    Ok(())
}

fn normalize_menu_action(id: &str) -> Option<&str> {
    match id {
        "newConnection" | "connectionNewConnection" => Some("newConnection"),
        "newTab" => Some("newTab"),
        "closeTab" => Some("closeTab"),
        "openSettings" => Some("openSettings"),
        "openShortcuts" => Some("openShortcuts"),
        "refreshTree" | "connectionRefreshTree" => Some("refreshTree"),
        "openAbout" => Some("openAbout"),
        "checkUpdates" => Some("checkUpdates"),
        "openDocumentation" => Some("openDocumentation"),
        _ => None,
    }
}

fn build_menu<R: Runtime, M: Manager<R>>(manager: &M) -> tauri::Result<Menu<R>> {
    let mut builder = MenuBuilder::new(manager);

    #[cfg(target_os = "macos")]
    {
        let app_menu = SubmenuBuilder::new(manager, "DBO")
            .about(Some(AboutMetadata {
                name: Some("DBO".into()),
                ..Default::default()
            }))
            .separator()
            .services()
            .separator()
            .hide()
            .hide_others()
            .show_all()
            .separator()
            .quit()
            .build()?;
        builder = builder.item(&app_menu);
    }

    let file_menu = {
        #[allow(unused_mut)]
        let mut file = SubmenuBuilder::new(manager, "File")
            .item(
                &MenuItemBuilder::with_id("newConnection", "New Connection")
                    .accelerator("CmdOrCtrl+Shift+C")
                    .build(manager)?,
            )
            .item(
                &MenuItemBuilder::with_id("newTab", "New Query Tab")
                    .accelerator("CmdOrCtrl+T")
                    .build(manager)?,
            )
            .item(
                &MenuItemBuilder::with_id("closeTab", "Close Tab")
                    .accelerator("CmdOrCtrl+W")
                    .build(manager)?,
            )
            .separator()
            .item(
                &MenuItemBuilder::with_id("openSettings", "Settings")
                    .accelerator("CmdOrCtrl+,")
                    .build(manager)?,
            );

        #[cfg(not(target_os = "macos"))]
        {
            file = file
                .separator()
                .item(&PredefinedMenuItem::quit(manager, Some("Quit"))?);
        }

        file.build()?
    };

    let edit_menu = SubmenuBuilder::new(manager, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let view_menu = SubmenuBuilder::new(manager, "View")
        .item(
            &MenuItemBuilder::with_id("refreshTree", "Refresh")
                .accelerator("CmdOrCtrl+R")
                .build(manager)?,
        )
        .build()?;

    let connection_menu = SubmenuBuilder::new(manager, "Connection")
        .item(
            &MenuItemBuilder::with_id("connectionNewConnection", "New Connection").build(manager)?,
        )
        .item(
            &MenuItemBuilder::with_id("connectionRefreshTree", "Refresh Tree").build(manager)?,
        )
        .build()?;

    let window_menu = SubmenuBuilder::new(manager, "Window")
        .minimize()
        .maximize()
        .separator()
        .fullscreen()
        .build()?;

    let help_menu = SubmenuBuilder::new(manager, "Help")
        .item(&MenuItemBuilder::with_id("openDocumentation", "Documentation").build(manager)?)
        .item(
            &MenuItemBuilder::with_id("openShortcuts", "Keyboard Shortcuts")
                .accelerator("CmdOrCtrl+/")
                .build(manager)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("checkUpdates", "Check for Updates").build(manager)?)
        .item(&MenuItemBuilder::with_id("openAbout", "About DBO").build(manager)?)
        .build()?;

    builder
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&connection_menu)
        .item(&window_menu)
        .item(&help_menu)
        .build()
}
