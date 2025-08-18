import React from "react";
import { writeText as writeToClipboard } from "@tauri-apps/plugin-clipboard-manager";
import { Clipboard, ArrowLeft, FileSearch } from "lucide-react";
import { UploadItem } from "./App";

interface HistoryPageProps {
  recentFiles: UploadItem[];
  onBack: () => void;
  showNotification: (title: string, body: string) => void;
}

export function HistoryPage({
  recentFiles,
  onBack,
  showNotification,
}: HistoryPageProps) {
  const handleCopy = async (url: string) => {
    try {
      await writeToClipboard(url);
      showNotification("Copied!", "URL copied to clipboard");
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="bg-gray-950 text-white p-4 w-[280px] h-[305px] flex flex-col rounded-lg border border-gray-800 shadow-lg overflow-hidden">
      <header className="flex items-center mb-4 px-1">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto scroll-clean">
        {recentFiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4">
            <FileSearch className="w-8 h-8 mb-2 opacity-60" />
            <p className="text-sm">No upload history yet</p>
          </div>
        ) : (
          <ul className="space-y-1.5 px-1">
            {recentFiles.slice(0, 10).map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between p-2 hover:bg-gray-800/30 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-0.5">
                  <h3 className="text-sm text-gray-300 truncate font-medium">
                    {item.fileName}
                  </h3>
                  <time className="text-xs text-gray-500 font-mono">
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>

                <button
                  onClick={() =>
                    item.downloadUrl && handleCopy(item.downloadUrl)
                  }
                  className="text-gray-400 hover:text-gray-200 p-1.5 rounded hover:bg-gray-700/50 transition-colors"
                  title="Copy URL"
                >
                  <Clipboard className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
