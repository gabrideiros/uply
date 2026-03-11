import React, { useState, useEffect } from "react";
import {
  loadR2Credentials,
  saveR2Credentials,
  R2Credentials,
} from "./util/r2Store";
import { X } from "lucide-react";

interface SettingsPageProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsPageProps) {
  const [credentials, setCredentials] = useState<R2Credentials>({
    account_id: "",
    access_key_id: "",
    access_key_secret: "",
    bucket_name: "",
    public_url: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCredentials() {
      setIsLoading(true);
      const savedCredentials = await loadR2Credentials();
      if (savedCredentials) {
        setCredentials(savedCredentials);
      }
      setIsLoading(false);
    }

    loadCredentials();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveR2Credentials(credentials);
    onBack();
  };

  return (
    <div className="bg-zinc-900/90 [backdrop-filter:blur(40px)] text-white p-3 w-[280px] h-[305px] flex flex-col rounded-none border border-white/8">
      <div className="px-1 pb-2 flex justify-between items-center">
        <h2 className="text-sm font-medium text-white/80">
          Cloudflare R2 Settings
        </h2>
        <button onClick={onBack} className="text-white/30 hover:text-white/70 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="h-px bg-white/6 mx-1 mb-2" />

      <div className="overflow-y-auto flex-1 px-1 scroll-clean">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b border-white/30"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div>
              <label className="block text-xs text-white/40 mb-1">
                Account ID
              </label>
              <input
                type="text"
                name="account_id"
                value={credentials.account_id}
                onChange={handleInputChange}
                className="w-full px-2 py-1.5 text-xs bg-white/6 border border-white/8 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400/50 text-white/80 placeholder:text-white/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1">
                Access Key ID
              </label>
              <input
                type="text"
                name="access_key_id"
                value={credentials.access_key_id}
                onChange={handleInputChange}
                className="w-full px-2 py-1.5 text-xs bg-white/6 border border-white/8 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400/50 text-white/80 placeholder:text-white/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1">
                Access Key Secret
              </label>
              <input
                type="password"
                name="access_key_secret"
                value={credentials.access_key_secret}
                onChange={handleInputChange}
                className="w-full px-2 py-1.5 text-xs bg-white/6 border border-white/8 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400/50 text-white/80 placeholder:text-white/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1">
                Bucket Name
              </label>
              <input
                type="text"
                name="bucket_name"
                value={credentials.bucket_name}
                onChange={handleInputChange}
                className="w-full px-2 py-1.5 text-xs bg-white/6 border border-white/8 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400/50 text-white/80 placeholder:text-white/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1">
                Public URL
              </label>
              <input
                type="url"
                name="public_url"
                value={credentials.public_url}
                onChange={handleInputChange}
                className="w-full px-2 py-1.5 text-xs bg-white/6 border border-white/8 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400/50 text-white/80 placeholder:text-white/20"
                required
              />
            </div>
          </form>
        )}
      </div>

      <div className="h-px bg-white/6 mx-1 my-2" />

      <div className="flex justify-end gap-2 px-1">
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1 text-xs border border-white/10 rounded-lg text-white/60 hover:bg-white/6 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          className="px-3 py-1 text-xs rounded-lg text-white bg-blue-500/80 hover:bg-blue-500 transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}
