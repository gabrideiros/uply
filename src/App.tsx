import React, { useState, useEffect } from "react";
import { loadHistory } from "./util/historyStore";

import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { Home } from "./Home";
import { HistoryPage } from "./HistoryPage";
import { Settings } from "./Settings";
import { useHotkeys } from "react-hotkeys-hook";
import { getCurrentWindow } from "@tauri-apps/api/window";

export interface UploadItem {
  id: string;
  filePath: string;
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  downloadUrl?: string;
  timestamp: number;
}

export function App() {
  const [recentFiles, setRecentFiles] = useState<UploadItem[]>([]);
  const [currentPage, setCurrentPage] = useState<
    "main" | "history" | "settings"
  >("main");

  useHotkeys(
    "mod+q",
    async () => {
      onQuit();
    },
    { preventDefault: true }
  );

  useEffect(() => {
    (async () => {
      const history = await loadHistory();
      setRecentFiles(history);
    })();
  }, []);

  useEffect(() => {
    isPermissionGranted().then((granted) => {
      if (!granted) requestPermission();
    });
  }, []);

  async function showNotification(title: string, body: string) {
    const permissionGranted = await isPermissionGranted();
    if (permissionGranted) {
      sendNotification({ title, body });
    }
  }

  async function onQuit() {
    await getCurrentWindow().hide();
  }

  return (
    <>
      {currentPage === "main" && (
        <Home
          showNotification={showNotification}
          setRecentFiles={setRecentFiles}
          recentFiles={recentFiles}
          onHistory={() => setCurrentPage("history")}
          onSettings={() => setCurrentPage("settings")}
          onQuit={onQuit}
        />
      )}
      {currentPage === "history" && (
        <HistoryPage
          recentFiles={recentFiles}
          onBack={() => setCurrentPage("main")}
          showNotification={showNotification}
        />
      )}
      {currentPage === "settings" && (
        <Settings onBack={() => setCurrentPage("main")} />
      )}
    </>
  );
}
