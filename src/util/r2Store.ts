import { load } from "@tauri-apps/plugin-store";

const CREDENTIALS_STORE = "r2-credentials.json";

export interface R2Credentials {
  account_id: string;
  access_key_id: string;
  access_key_secret: string;
  bucket_name: string;
  public_url: string;
}

export async function loadR2Credentials(): Promise<R2Credentials | null> {
  try {
    const store = await load(CREDENTIALS_STORE);
    const credentials = await store.get<R2Credentials>("r2_credentials");
    return credentials || null;
  } catch (error) {
    console.error("Failed to load R2 credentials:", error);
    return null;
  }
}

export async function saveR2Credentials(
  credentials: R2Credentials
): Promise<boolean> {
  try {
    const store = await load(CREDENTIALS_STORE);
    await store.set("r2_credentials", credentials);
    await store.save();
    return true;
  } catch (error) {
    console.error("Failed to save R2 credentials:", error);
    return false;
  }
}
