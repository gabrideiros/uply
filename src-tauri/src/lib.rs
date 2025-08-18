use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_positioner::{Position, WindowExt};

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::Client;

use futures_util::stream::StreamExt;
use tokio::io::BufReader;
use tokio_util::io::ReaderStream;

use tauri_plugin_store::StoreExt;

#[tauri::command]
async fn upload_to_r2(
    object_key: &str,
    file_path: String,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let store = app
        .store("r2-credentials.json")
        .map_err(|e| e.to_string())?;

    let credentials = store
        .get("r2_credentials")
        .expect("Failed to load R2 credentials");

    let account_id = credentials["account_id"]
        .as_str()
        .ok_or("Invalid account_id")?;
    let access_key_id = credentials["access_key_id"]
        .as_str()
        .ok_or("Invalid access_key_id")?;
    let access_key_secret = credentials["access_key_secret"]
        .as_str()
        .ok_or("Invalid access_key_secret")?;
    let bucket_name = credentials["bucket_name"]
        .as_str()
        .ok_or("Invalid bucket_name")?;
    let public_url = credentials["public_url"]
        .as_str()
        .ok_or("Invalid public_url")?;

    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(object_key);

    println!("Uploading file: {}", file_name);

    let file_bytes = std::fs::read(&file_path).map_err(|e| e.to_string())?;
    let total_size = file_bytes.len();

    let reader = BufReader::new(file_bytes.as_slice());
    let mut stream = ReaderStream::new(reader);

    let mut uploaded = 0;
    let mut chunks = vec![];

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| e.to_string())?;
        uploaded += chunk.len();
        chunks.push(chunk);

        app.emit(
            "upload_progress",
            serde_json::json!({
                "progress": uploaded,
                "total": total_size,
                "file_name": file_name
            }),
        )
        .ok();
    }

    let body = ByteStream::from(file_bytes);

    let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .endpoint_url(format!("https://{}.r2.cloudflarestorage.com", account_id))
        .credentials_provider(aws_sdk_s3::config::Credentials::new(
            access_key_id,
            access_key_secret,
            None,
            None,
            "R2",
        ))
        .region("auto")
        .load()
        .await;

    let client = Client::new(&config);

    client
        .put_object()
        .bucket(bucket_name)
        .key(file_name)
        .body(body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(format!("{}/{}", public_url, file_name))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let last_click_time = Arc::new(Mutex::new(Instant::now()));

    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(Default::default(), None))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_clipboard::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![upload_to_r2])
        .setup(move |app| {
            use tauri_plugin_autostart::MacosLauncher;
            use tauri_plugin_autostart::ManagerExt;

            let _ = app.handle().plugin(tauri_plugin_autostart::init(
                MacosLauncher::LaunchAgent,
                Some(vec!["--flag1", "--flag2"]),
            ));

            let autostart_manager = app.autolaunch();
            let _ = autostart_manager.enable();

            let _ = app.store("r2-credentials.json");
            let last_click_time_clone = last_click_time.clone();

            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;

            let _ = TrayIconBuilder::new()
                .tooltip("Uply")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(move |tray_handle, event| {
                    let now = Instant::now();
                    let mut last_click = last_click_time_clone.lock().unwrap();

                    if now.duration_since(*last_click) < Duration::from_millis(300) {
                        return;
                    }

                    *last_click = now;

                    let app_handle = tray_handle.app_handle().clone();
                    tauri_plugin_positioner::on_tray_event(&app_handle, &event);
                    match event {
                        TrayIconEvent::Click { button, .. } => match button {
                            MouseButton::Left => {
                                let window = app_handle.get_webview_window("main").unwrap();
                                let _ = window.move_window(Position::TrayCenter);

                                if window.is_visible().unwrap() {
                                    window.hide().unwrap();
                                } else {
                                    window.show().unwrap();
                                    window.set_focus().unwrap();
                                }
                            }
                            MouseButton::Right => {
                                println!("Right click on tray icon");
                            }
                            _ => {}
                        },
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
