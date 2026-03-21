mod file_io;
mod recent_files;

use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Build native menu
            let new_file = MenuItemBuilder::with_id("new_file", "New")
                .accelerator("CmdOrCtrl+N")
                .build(app)?;
            let open_file = MenuItemBuilder::with_id("open_file", "Open...")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;
            let save_file = MenuItemBuilder::with_id("save_file", "Save")
                .accelerator("CmdOrCtrl+S")
                .build(app)?;
            let save_as = MenuItemBuilder::with_id("save_as", "Save As...")
                .accelerator("CmdOrCtrl+Shift+S")
                .build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit MAX Mind")
                .accelerator("CmdOrCtrl+Q")
                .build(app)?;

            let undo = MenuItemBuilder::with_id("undo", "Undo")
                .accelerator("CmdOrCtrl+Z")
                .build(app)?;
            let redo = MenuItemBuilder::with_id("redo", "Redo")
                .accelerator("CmdOrCtrl+Shift+Z")
                .build(app)?;

            // Recent files submenu
            let recent_files = recent_files::load_recent_files();
            let mut recent_submenu = SubmenuBuilder::new(app, "Open Recent");

            for (i, rf) in recent_files.iter().enumerate() {
                let item = MenuItemBuilder::with_id(format!("recent_{}", i), &rf.name)
                    .build(app)?;
                recent_submenu = recent_submenu.item(&item);
            }

            if !recent_files.is_empty() {
                recent_submenu = recent_submenu.separator();
            }
            let clear_recent = MenuItemBuilder::with_id("clear_recent", "Clear Recent")
                .build(app)?;
            recent_submenu = recent_submenu.item(&clear_recent);
            let recent_submenu = recent_submenu.build()?;

            // App menu (macOS: first menu is the app name menu)
            let app_menu = SubmenuBuilder::new(app, "MAX Mind")
                .item(&PredefinedMenuItem::about(app, Some("About MAX Mind"), None)?)
                .separator()
                .item(&PredefinedMenuItem::hide(app, None)?)
                .item(&PredefinedMenuItem::hide_others(app, None)?)
                .item(&PredefinedMenuItem::show_all(app, None)?)
                .separator()
                .item(&quit)
                .build()?;

            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&new_file)
                .item(&open_file)
                .item(&recent_submenu)
                .separator()
                .item(&save_file)
                .item(&save_as)
                .build()?;

            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .item(&undo)
                .item(&redo)
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            let window_menu = SubmenuBuilder::new(app, "Window")
                .item(&PredefinedMenuItem::minimize(app, None)?)
                .item(&PredefinedMenuItem::maximize(app, None)?)
                .separator()
                .item(&PredefinedMenuItem::fullscreen(app, None)?)
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&window_menu)
                .build()?;

            app.set_menu(menu)?;

            // Store recent files paths for menu event lookup
            let recent_paths: Vec<String> = recent_files.iter().map(|f| f.path.clone()).collect();

            // Handle menu events
            let app_handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                let id = event.id().0.as_str();
                match id {
                    "new_file" => { let _ = app_handle.emit("menu-event", "new_file"); }
                    "open_file" => { let _ = app_handle.emit("menu-event", "open_file"); }
                    "save_file" => { let _ = app_handle.emit("menu-event", "save_file"); }
                    "save_as" => { let _ = app_handle.emit("menu-event", "save_as"); }
                    "undo" => { let _ = app_handle.emit("menu-event", "undo"); }
                    "redo" => { let _ = app_handle.emit("menu-event", "redo"); }
                    "quit" => { let _ = app_handle.emit("menu-event", "quit"); }
                    "clear_recent" => {
                        recent_files::clear_recent_files();
                        let _ = app_handle.emit("menu-event", "recent_cleared");
                    }
                    other => {
                        if let Some(idx_str) = other.strip_prefix("recent_") {
                            if let Ok(idx) = idx_str.parse::<usize>() {
                                if let Some(path) = recent_paths.get(idx) {
                                    let _ = app_handle.emit("open-recent-file", path.clone());
                                }
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            file_io::save_file,
            file_io::open_file,
            file_io::new_file_path,
            recent_files::get_recent_files,
            recent_files::add_to_recent_files,
            recent_files::clear_recent_files_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
