import { load } from "@tauri-apps/plugin-store";
import type { UploadItem } from "../App";

let store: Awaited<ReturnType<typeof load>> | null = null;

async function initStore() {
  if (!store) {
    store = await load("history.json", { autoSave: false, defaults: {} });
  }
  return store;
}

export async function loadHistory(): Promise<UploadItem[]> {
  const s = await initStore();
  const history = (await s.get<UploadItem[]>("recentFiles")) ?? [];
  return history;
}

export async function saveHistory(files: UploadItem[]) {
  const s = await initStore();
  console.log("Saving history:", { value: files });
  await s.set("recentFiles", files);
  await s.save();
}
