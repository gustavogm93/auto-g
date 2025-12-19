"use client";

import type { Issue } from "@/types/issue";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { IssueCard } from "./IssueCard";

interface IssueResponse {
  issues: Issue[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function IssueList() {
  const [data, setData] = useState<IssueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchIssues = async () => {
    try {
      const response = await fetch("/api/issues");
      if (!response.ok) throw new Error("Failed to fetch issues");
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const handleIssueUpdate = (updatedIssue: Issue) => {
    if (data) {
      setData({
        ...data,
        issues: data.issues.map((issue) =>
          issue.id === updatedIssue.id ? updatedIssue : issue
        ),
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading issues...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            fetchIssues();
          }}
          className="mt-2 text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data?.issues.length) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">No issues found.</p>
        <p className="text-sm text-gray-400 mt-2">
          Click "Sync Issues" to fetch issues from GitHub.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-700">
          {data.pagination.total} Issue{data.pagination.total !== 1 ? "s" : ""}
        </h2>
      </div>

      <div className="grid gap-4">
        {data.issues.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            isExpanded={expandedId === issue.id}
            onToggle={() =>
              setExpandedId(expandedId === issue.id ? null : issue.id)
            }
            onUpdate={handleIssueUpdate}
          />
        ))}
      </div>
    </div>
  );
}
