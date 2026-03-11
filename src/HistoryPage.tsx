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
    <div className="bg-zinc-900/90 [backdrop-filter:blur(40px)] text-white p-3 w-[280px] h-[305px] flex flex-col rounded-none border border-white/8 overflow-hidden">
      <header className="flex items-center mb-2 px-1">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm">Back</span>
        </button>
      </header>

      <div className="h-px bg-white/6 mx-1 mb-2" />

      <main className="flex-1 overflow-y-auto scroll-clean">
        {recentFiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/25 p-4">
            <FileSearch className="w-8 h-8 mb-2" />
            <p className="text-sm">No upload history yet</p>
          </div>
        ) : (
          <ul className="space-y-0.5 px-1">
            {recentFiles.slice(0, 10).map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between p-2 hover:bg-white/6 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-0.5">
                  <h3 className="text-sm text-white/80 truncate">
                    {item.fileName}
                  </h3>
                  <time className="text-xs text-white/30 font-mono">
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
                  className="text-white/30 hover:text-white/70 p-1.5 rounded-lg hover:bg-white/6 transition-colors"
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
