use serde_json::Value;
use std::fs::File;
use std::io::{Read, Write};
use std::path::PathBuf;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

/// Save workbook data as a .xmind file (ZIP archive with content.json)
#[tauri::command]
pub fn save_file(path: String, content: Value, metadata: Value) -> Result<(), String> {
    let file = File::create(&path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // Write content.json
    zip.start_file("content.json", options)
        .map_err(|e| e.to_string())?;
    let content_bytes = serde_json::to_string_pretty(&content).map_err(|e| e.to_string())?;
    zip.write_all(content_bytes.as_bytes())
        .map_err(|e| e.to_string())?;

    // Write metadata.json
    zip.start_file("metadata.json", options)
        .map_err(|e| e.to_string())?;
    let metadata_bytes = serde_json::to_string_pretty(&metadata).map_err(|e| e.to_string())?;
    zip.write_all(metadata_bytes.as_bytes())
        .map_err(|e| e.to_string())?;

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

/// Open a .xmind file and return its content.json
#[tauri::command]
pub fn open_file(path: String) -> Result<Value, String> {
    let file = File::open(&path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    let mut content_file = archive
        .by_name("content.json")
        .map_err(|e| e.to_string())?;

    let mut content_str = String::new();
    content_file
        .read_to_string(&mut content_str)
        .map_err(|e| e.to_string())?;

    let value: Value = serde_json::from_str(&content_str).map_err(|e| e.to_string())?;
    Ok(value)
}

/// Generate a default file path for new files
#[tauri::command]
pub fn new_file_path() -> Result<String, String> {
    let home = dirs_or_default();
    let path = PathBuf::from(home)
        .join("Documents")
        .join(format!("mindmap-{}.xmind", uuid::Uuid::new_v4()));
    Ok(path.to_string_lossy().to_string())
}

fn dirs_or_default() -> String {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string())
}
