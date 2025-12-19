"use client";

import { Github, RefreshCw } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch("/api/sync-issues", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        setSyncResult(
          `✅ Synced: ${data.created || 0} created, ${data.updated || 0} updated`
        );
        // Reload the page to refresh the issue list
        window.location.reload();
      } else {
        setSyncResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setSyncResult(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Github className="h-8 w-8 text-gray-900" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Auto-G</h1>
              <p className="text-sm text-gray-500">GitHub Issue Manager</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {syncResult && (
              <span className="text-sm text-gray-600">{syncResult}</span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw
                className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? "Syncing..." : "Sync Issues"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
