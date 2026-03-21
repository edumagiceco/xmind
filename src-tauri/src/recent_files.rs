use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const MAX_RECENT_FILES: usize = 10;
const RECENT_FILES_NAME: &str = "recent_files.json";

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RecentFile {
    pub path: String,
    pub name: String,
}

fn recent_files_path() -> PathBuf {
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("com.mindmap.magicmind");
    fs::create_dir_all(&config_dir).ok();
    config_dir.join(RECENT_FILES_NAME)
}

pub fn load_recent_files() -> Vec<RecentFile> {
    let path = recent_files_path();
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

fn save_recent_files(files: &[RecentFile]) {
    let path = recent_files_path();
    if let Ok(json) = serde_json::to_string_pretty(files) {
        fs::write(path, json).ok();
    }
}

pub fn add_recent_file(file_path: &str) {
    let mut files = load_recent_files();

    // Remove existing entry with the same path
    files.retain(|f| f.path != file_path);

    // Extract file name
    let name = std::path::Path::new(file_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| file_path.to_string());

    // Insert at the beginning
    files.insert(0, RecentFile { path: file_path.to_string(), name });

    // Keep only MAX_RECENT_FILES
    files.truncate(MAX_RECENT_FILES);

    save_recent_files(&files);
}

pub fn clear_recent_files() {
    save_recent_files(&[]);
}

#[tauri::command]
pub fn get_recent_files() -> Vec<RecentFile> {
    load_recent_files()
}

#[tauri::command]
pub fn add_to_recent_files(path: String) {
    add_recent_file(&path);
}

#[tauri::command]
pub fn clear_recent_files_cmd() {
    clear_recent_files();
}
