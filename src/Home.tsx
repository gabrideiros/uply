import React, { useEffect, useRef, useState } from "react";

import { getCurrentWebview } from "@tauri-apps/api/webview";
import { writeText as writeToClipboard } from "@tauri-apps/plugin-clipboard-manager";
import clipboard from "tauri-plugin-clipboard-api";
import { open } from "@tauri-apps/plugin-dialog";

import { useHotkeys } from "react-hotkeys-hook";
import { Upload, FileInput, ClipboardPaste, X, History } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { saveHistory } from "./util/historyStore";
import { UploadItem } from "./App";

interface UploadProgressEvent {
  progress: number;
  total: number;
  file_name: string;
}

interface HomeProps {
  showNotification: (title: string, body: string) => void;
  setRecentFiles: React.Dispatch<React.SetStateAction<UploadItem[]>>;
  recentFiles: UploadItem[];
  onHistory: () => void;
  onSettings: () => void;
  onQuit: () => void;
}

export function Home({
  showNotification,
  setRecentFiles,
  recentFiles,
  onHistory,
  onSettings,
  onQuit,
}: HomeProps) {
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const abortControllerRef = useRef<AbortController>();

  const openDialog = async () => {
    try {
      const selected = await open({
        multiple: true,
        directory: false,
      });

      if (selected) {
        const files = Array.isArray(selected) ? selected : [selected];
        handleFilesSelected(files);
      }
    } catch (error) {
      console.error("Error opening dialog:", error);
    }
  };

  useEffect(() => {
    let unlisten: () => void;

    const setupDragDrop = async () => {
      try {
        const webview = await getCurrentWebview();
        unlisten = await webview.onDragDropEvent((event) => {
          if (event.payload.type === "enter") {
            setIsDragging(true);
          } else if (event.payload.type === "drop") {
            const paths = event.payload.paths;
            if (paths && paths.length > 0) {
              handleFilesSelected(paths);
            }
            setIsDragging(false);
          } else if (event.payload.type === "leave") {
            setIsDragging(false);
          }
        });
      } catch (error) {
        console.error("Error setting up drag and drop:", error);
      }
    };

    setupDragDrop();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    const unlistenPromise = listen<UploadProgressEvent>(
      "upload_progress",
      ({ payload }) => {
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.fileName === payload.file_name
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

  useHotkeys("mod+o", () => openDialog(), { preventDefault: true });
  useHotkeys("mod+v", handlePasteFromClipboard, { preventDefault: true });
  useHotkeys("mod+h", onHistory, { preventDefault: true });
  useHotkeys("mod+s", onSettings, { preventDefault: true });

  async function uploadFileToR2(
    filePath: string,
    fileName: string
  ): Promise<string> {
    try {
      const downloadUrl = await invoke<string>("upload_to_r2", {
        filePath: filePath,
        objectKey: fileName,
      });
      return downloadUrl;
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  }

  async function handleFilesSelected(files: string[]) {
    if (files.length === 0) return;

    const newUploads: UploadItem[] = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      fileName: extractFileName(file),
      filePath: file,
      progress: 0,
      status: "pending",
      timestamp: Date.now(),
    }));

    setUploadQueue((prev) => [...newUploads, ...prev]);

    for (const uploadItem of newUploads) {
      try {
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === uploadItem.id ? { ...item, status: "uploading" } : item
          )
        );

        const downloadUrl = await uploadFileToR2(
          uploadItem.filePath,
          uploadItem.fileName
        );

        setUploadQueue((prev) =>
          prev.filter((item) => item.id !== uploadItem.id)
        );

        const completedItem = {
          ...uploadItem,
          progress: 100,
          status: "completed" as const,
          downloadUrl,
          timestamp: Date.now(),
        };

        setRecentFiles((prev) => [completedItem, ...prev]);

        await writeToClipboard(downloadUrl);
        showNotification(
          "Upload completed",
          `URL for ${uploadItem.fileName} copied to clipboard!`
        );
      } catch (error) {
        console.error("Upload failed:", error);
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === uploadItem.id ? { ...item, status: "error" } : item
          )
        );
      }
      saveHistory(recentFiles);
    }
  }

  async function handlePasteFromClipboard() {
    const files = await clipboard.readFiles();
    handleFilesSelected(files);
  }

  function handleCancelUpload(id: string) {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
  }

  function truncateFileName(name: string, length = 20) {
    return name.length > length ? name.substring(0, length - 3) + "..." : name;
  }

  function extractFileName(fullPath: string): string {
    const normalizedPath = fullPath.replace(/\\/g, "/");
    const fileName = normalizedPath.split("/").pop() || fullPath;
    return fileName;
  }

  const uploadStatus =
    uploadQueue.length > 0 ? "uploading" : isDragging ? "dragging" : "idle";

  return (
    <div className="bg-zinc-900/90 [backdrop-filter:blur(40px)] text-white p-3 w-[280px] h-[305px] flex flex-col rounded-none border border-white/[0.08]">
      <div
        className={`
              flex-1 border border-dashed rounded-xl p-4 cursor-pointer mb-2
              ${
                uploadStatus === "dragging"
                  ? "border-blue-400/50 bg-blue-400/5 animate-pulse"
                  : uploadStatus === "uploading"
                  ? "border-white/10"
                  : "border-white/10 hover:border-white/20"
              }
              flex items-center justify-center transition-colors duration-200
            `}
        onClick={openDialog}
      >
        {uploadStatus === "dragging" && (
          <div className="flex items-center gap-2 text-white/60">
            <Upload className="w-4 h-4" />
            <span className="text-sm">Drop to upload</span>
          </div>
        )}

        {uploadStatus === "uploading" && (
          <div className="flex flex-col items-center w-full gap-2">
            {uploadQueue.slice(0, 2).map((item) => (
              <div key={item.id} className="w-full">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="truncate max-w-[120px] text-white/80">
                    {truncateFileName(item.fileName, 15)}
                  </span>
                  <span className="text-white/40 text-xs">
                    {item.progress}%
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelUpload(item.id);
                    }}
                    className="text-white/40 hover:text-white/70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
            {uploadQueue.length > 2 && (
              <span className="text-xs text-white/40">
                +{uploadQueue.length - 2} more files...
              </span>
            )}
          </div>
        )}

        {uploadStatus === "idle" && (
          <div className="flex flex-col items-center gap-1 text-white/30">
            <Upload className="w-4 h-4" />
            <span className="text-sm">Drag files here</span>
          </div>
        )}
      </div>

      <div className="h-px bg-white/[0.06] mx-1 my-1" />

      <div className="space-y-0.5">
        <button
          onClick={openDialog}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.06] rounded-lg text-left transition-colors duration-150 text-sm"
        >
          <FileInput className="w-4 h-4 text-white/40" />
          <span className="text-white/80">Select file</span>
          <span className="ml-auto text-xs text-white/25">⌘ O</span>
        </button>

        <button
          onClick={handlePasteFromClipboard}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.06] rounded-lg text-left transition-colors duration-150 text-sm"
        >
          <ClipboardPaste className="w-4 h-4 text-white/40" />
          <span className="text-white/80">Paste from clipboard</span>
          <span className="ml-auto text-xs text-white/25">⌘ V</span>
        </button>
        <button
          onClick={onHistory}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.06] rounded-lg text-left transition-colors duration-150 text-sm"
        >
          <History className="w-4 h-4 text-white/40" />
          <span className="text-white/80">Recent uploads</span>
          <span className="ml-auto text-xs text-white/25">⌘ H</span>
        </button>
      </div>

      <div className="h-px bg-white/[0.06] mx-1 my-1" />

      <div className="space-y-0.5">
        <button
          onClick={onSettings}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.06] rounded-lg text-left transition-colors duration-150 text-sm"
        >
          <span className="text-white/80">Settings</span>
          <span className="ml-auto text-xs text-white/25">⌘ ,</span>
        </button>
        <button
          onClick={onQuit}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.06] rounded-lg text-left transition-colors duration-150 text-sm"
        >
          <span className="text-white/80">Quit</span>
          <span className="ml-auto text-xs text-white/25">⌘ Q</span>
        </button>
      </div>
    </div>
  );
}
