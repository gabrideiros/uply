import React, { useState, useRef, useEffect } from "react";
import { writeText as writeToClipboard } from "@tauri-apps/plugin-clipboard-manager";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { useHotkeys } from "react-hotkeys-hook";
import { useDropzone } from "react-dropzone";
import { Upload, File, Clipboard, X, Power } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  downloadUrl?: string;
}

interface UploadProgressEvent {
  progress: number;
  total: number;
  file_name: string;
}

export function App() {
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [recentFiles, setRecentFiles] = useState<UploadItem[]>([]);
  const abortControllerRef = useRef<AbortController>();

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleFilesSelected,
    noClick: true,
    noKeyboard: true,
    multiple: true,
  });

  useEffect(() => {
    const unlistenPromise = listen<UploadProgressEvent>(
      "upload_progress",
      ({ payload }) => {
        console.log("Upload progress:", payload.progress);
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.file.name === payload.file_name
              ? {
                  ...item,
                  progress: Math.min(
                    100,
                    Math.round((payload.progress / payload.total) * 100)
                  ),
                }
              : item
          )
        );
      }
    );

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    isPermissionGranted().then((granted) => {
      if (!granted) requestPermission();
    });
  }, []);

  useHotkeys("mod+o", () => open(), { preventDefault: true });
  useHotkeys("mod+v", handlePasteFromClipboard, { preventDefault: true });
  useHotkeys(
    "mod+q",
    async () => {
      await getCurrentWindow().hide();
    },
    { preventDefault: true }
  );

  async function uploadFileToR2(file: File): Promise<string> {
    const fileName = file.name;

    try {
      const downloadUrl = await invoke<string>("upload_to_r2", {
        fileBytes: await file.arrayBuffer(),
        objectKey: fileName,
      });

      return downloadUrl;
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  }

  async function handleFilesSelected(files: File[]) {
    if (files.length === 0) return;

    const newUploads: UploadItem[] = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      progress: 0,
      status: "pending",
    }));

    setUploadQueue((prev) => [...newUploads, ...prev]);

    for (const uploadItem of newUploads) {
      try {
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === uploadItem.id ? { ...item, status: "uploading" } : item
          )
        );

        const downloadUrl = await uploadFileToR2(uploadItem.file);

        setUploadQueue((prev) =>
          prev.filter((item) => item.id !== uploadItem.id)
        );
        setRecentFiles((prev) =>
          [
            {
              ...uploadItem,
              progress: uploadItem.progress,
              status: "completed" as "completed",
              downloadUrl,
            },
            ...prev,
          ].slice(0, 3)
        );

        if (files[files.length - 1].name === uploadItem.file.name) {
          await writeToClipboard(downloadUrl);
          showNotification("Upload completed", "File URL copied to clipboard!");
        }
      } catch (error) {
        console.error("Upload failed:", error);
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === uploadItem.id ? { ...item, status: "error" } : item
          )
        );
      }
    }
  }

  async function showNotification(title: string, body: string) {
    const permissionGranted = await isPermissionGranted();
    if (permissionGranted) {
      sendNotification({ title, body });
    }
  }

  async function handlePasteFromClipboard() {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const files: File[] = [];

      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          try {
            const blob = await clipboardItem.getType(type);
            const extension = type.split("/")[1] || "bin";
            const file = new window.File([blob], `pasted-file.${extension}`, {
              type,
            });
            files.push(file);
          } catch (error) {
            console.error(`Failed to process type ${type}:`, error);
          }
        }
      }

      if (files.length > 0) {
        handleFilesSelected(files);
      }
    } catch (error) {
      console.error("Failed to read clipboard:", error);
    }
  }

  function handleCancelUpload(id: string) {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function truncateFileName(name: string, length = 20) {
    return name.length > length ? name.substring(0, length - 3) + "..." : name;
  }

  const uploadStatus =
    uploadQueue.length > 0 ? "uploading" : isDragActive ? "dragging" : "idle";

  return (
    <div className="bg-gray-950 text-white p-3 w-[280px] h-[250px] flex flex-col">
      <div
        {...getRootProps()}
        className={`
          flex-1 border-2 border-dashed rounded-lg p-4 cursor-pointer mb-2
          ${
            uploadStatus === "dragging"
              ? "border-blue-400 bg-blue-400/5 animate-pulse"
              : uploadStatus === "uploading"
              ? "border-violet-400/50"
              : "border-gray-600 hover:border-gray-500"
          }
          flex items-center justify-center
        `}
      >
        <input {...getInputProps()} />

        {uploadStatus === "dragging" && (
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span>Drop to upload</span>
          </div>
        )}

        {uploadStatus === "uploading" && (
          <div className="flex flex-col items-center w-full gap-2">
            {uploadQueue.slice(0, 2).map((item) => (
              <div key={item.id} className="w-full">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="truncate max-w-[120px]">
                    {truncateFileName(item.file.name, 15)}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {item.progress}%
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelUpload(item.id);
                    }}
                    className="text-red-300 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-400 transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
            {uploadQueue.length > 2 && (
              <span className="text-xs text-gray-400">
                +{uploadQueue.length - 2} more files...
              </span>
            )}
          </div>
        )}

        {uploadStatus === "idle" && (
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <Upload className="w-4 h-4" />
            <span className="text-sm">Drag files here</span>
          </div>
        )}
      </div>

      <div className="flex justify-center my-1">
        <div className="border-t border-gray-700 w-3/4" />
      </div>

      <div className="space-y-1">
        <button
          onClick={open}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800/30 rounded-lg text-left transition-colors duration-200 text-sm"
        >
          <File className="w-4 h-4 text-gray-400" />
          <span className="text-gray-300">Select file</span>
          <span className="ml-auto text-xs text-gray-500">CTRL + O</span>
        </button>

        <button
          onClick={handlePasteFromClipboard}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800/30 rounded-lg text-left transition-colors duration-200 text-sm"
        >
          <Clipboard className="w-4 h-4 text-gray-400" />
          <span className="text-gray-300">Paste from clipboard</span>
          <span className="ml-auto text-xs text-gray-500">CTRL + V</span>
        </button>
      </div>
    </div>
  );
}
