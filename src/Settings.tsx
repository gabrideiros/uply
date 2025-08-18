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
    <div className="bg-gray-950 text-white p-3 w-[280px] h-[305px] flex flex-col">
      <div className="p-3 border-b border-gray-800 flex justify-between items-center">
        <h2 className="text-sm font-medium text-gray-300">
          Cloudflare R2 Settings
        </h2>
        <button onClick={onBack} className="text-gray-500 hover:text-gray-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-3 scroll-clean">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Account ID
              </label>
              <input
                type="text"
                name="account_id"
                value={credentials.account_id}
                onChange={handleInputChange}
                className="w-full px-2 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Access Key ID
              </label>
              <input
                type="text"
                name="access_key_id"
                value={credentials.access_key_id}
                onChange={handleInputChange}
                className="w-full px-2 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Access Key Secret
              </label>
              <input
                type="password"
                name="access_key_secret"
                value={credentials.access_key_secret}
                onChange={handleInputChange}
                className="w-full px-2 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Bucket Name
              </label>
              <input
                type="text"
                name="bucket_name"
                value={credentials.bucket_name}
                onChange={handleInputChange}
                className="w-full px-2 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Public URL
              </label>
              <input
                type="url"
                name="public_url"
                value={credentials.public_url}
                onChange={handleInputChange}
                className="w-full px-2 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-200"
                required
              />
            </div>
          </form>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1 text-xs border border-gray-800 rounded text-gray-300 hover:bg-gray-800/50"
        >
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          className="px-3 py-1 text-xs border border-transparent rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}
