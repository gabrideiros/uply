use tauri::{
    menu::{Menu, MenuItem}, tray::{MouseButton, TrayIconBuilder, TrayIconEvent}, AppHandle, Emitter, Manager
};
use tauri_plugin_positioner::{Position, WindowExt};

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::Client;

use tokio_util::io::ReaderStream;
use tokio::io::BufReader;
use futures_util::stream::StreamExt;

use axum::{
    routing::post,
    Router,
    body::Bytes,
    http::StatusCode,
};
use std::net::SocketAddr;
use tokio::sync::oneshot;

struct UploadServer {
    shutdown_tx: Option<oneshot::Sender<()>>,
    port: u16,
}

impl UploadServer {
    async fn start(app: AppHandle) -> Result<Self, String> {
        let (shutdown_tx, shutdown_rx) = oneshot::channel();
        
        let port = get_available_port().await.ok_or("Failed to find available port")?;
        
        let app = Router::new()
            .route("/upload", post(handle_upload))
            .with_state(app.clone());
        
        let addr = SocketAddr::from(([127, 0, 0, 1], port));
        
        tokio::spawn(async move {
            axum::Server::bind(&addr)
                .serve(app.into_make_service())
                .with_graceful_shutdown(async {
                    shutdown_rx.await.ok();
                })
                .await
                .unwrap();
        });
        
        Ok(Self {
            shutdown_tx: Some(shutdown_tx),
            port,
        })
    }
    
    async fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

async fn handle_upload(
    app: AppHandle,
    bytes: Bytes,
) -> Result<String, (StatusCode, String)> {
    let object_key = "filename.ext";
    match upload_to_r2(&object_key, bytes.to_vec(), app.clone()).await {
        Ok(url) => Ok(url),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e)),
    }
}

async fn get_available_port() -> Option<u16> {
    (8000..9000).find(|port| {
        std::net::TcpStream::connect(("127.0.0.1", *port)).is_err()
    })
}

#[tauri::command]
async fn get_upload_server_port(app: tauri::AppHandle) -> Result<u16, String> {
    let server = app.state::<UploadServer>();
    Ok(server.port)
}

#[tauri::command]
async fn upload_to_r2(
    object_key: &str,
    file_bytes: Vec<u8>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let account_id = "0ce1390d16c398e8b4200d094032a694";
    let access_key_id = "d8f66589bc4e126ee3cb76a556382bfb";
    let access_key_secret = "6480104cc3504b1920a7f75caad6244f761b5da8b898a2fa501716baaf681e53";

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
                "file_name": object_key
            }),
        ).ok();
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
        .bucket("uply")
        .key(object_key)
        .body(body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(format!("https://pub-c8f9749bc25745e290d918615d3e3299.r2.dev/{}", object_key))
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let last_click_time = Arc::new(Mutex::new(Instant::now()));

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![upload_to_r2])
        .setup(move |app| {
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
