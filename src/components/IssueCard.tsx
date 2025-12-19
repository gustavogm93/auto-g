'use client'

import { useState, useMemo } from 'react'
import { ExternalLink, ChevronDown, ChevronUp, Play, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import type { Issue, WorkflowStatus } from '@/types/issue'

interface IssueCardProps {
  issue: Issue
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (issue: Issue) => void
}

// Get services from env var
function getServiceOptions() {
  const servicesEnv = process.env.NEXT_PUBLIC_SERVICES || ''
  if (!servicesEnv) {
    return [{ value: 'default', label: 'default' }]
  }
  return servicesEnv.split(',').map((s) => {
    const trimmed = s.trim()
    return { value: trimmed, label: trimmed }
  })
}

const workflowStatusStyles: Record<WorkflowStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending' },
  in_process: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Process' },
  end: { bg: 'bg-green-100', text: 'text-green-800', label: 'End' },
}

export function IssueCard({ issue, isExpanded, onToggle, onUpdate }: IssueCardProps) {
  const serviceOptions = useMemo(() => getServiceOptions(), [])
  const [selectedContext, setSelectedContext] = useState(serviceOptions[0]?.value || '')
  const [prompt, setPrompt] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const workflowStyle = workflowStatusStyles[issue.workflowStatus]
  const isGithubOpen = issue.statusGithub === 'open'
  const canStart = issue.workflowStatus === 'pending' && isGithubOpen

  const handleStart = async () => {
    if (!canStart) return
    
    setIsStarting(true)
    setError(null)

    try {
      const response = await fetch(`/api/issues/${issue.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedContext,
          prompt: prompt.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start issue')
      }

      const updatedIssue = await response.json()
      onUpdate(updatedIssue)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsStarting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                #{issue.githubNumber}
              </span>
              <span className="text-xs text-gray-400 truncate">
                {issue.repository}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 truncate">
              {issue.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* GitHub Status */}
            <span
              className={clsx(
                'text-xs px-2 py-1 rounded-full font-medium',
                isGithubOpen
                  ? 'bg-green-100 text-green-800'
                  : 'bg-purple-100 text-purple-800'
              )}
            >
              {isGithubOpen ? 'Open' : 'Closed'}
            </span>

            {/* Workflow Status */}
            <span
              className={clsx(
                'text-xs px-2 py-1 rounded-full font-medium',
                workflowStyle.bg,
                workflowStyle.text
              )}
            >
              {workflowStyle.label}
            </span>

            {/* External Link */}
            <a
              href={issue.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-gray-600"
            >
              <ExternalLink className="h-4 w-4" />
            </a>

            {/* Expand/Collapse */}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="flex gap-4 mt-2 text-xs text-gray-400">
          <span>Created: {formatDate(issue.createdAtGithub)}</span>
          <span>Updated: {formatDate(issue.updatedAtGithub)}</span>
        </div>
      </div>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          {/* Description */}
          {issue.description && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
                {issue.description}
              </p>
            </div>
          )}

          {/* Labels */}
          {issue.labels && Array.isArray(issue.labels) && issue.labels.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Labels
              </label>
              <div className="flex flex-wrap gap-1">
                {issue.labels.map((label, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded"
                  >
                    {String(label)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Current Context & Prompt (if already set) */}
          {issue.selectedContext && (
            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Context:</strong> {issue.selectedContext}
              </p>
              {issue.prompt && (
                <p className="text-sm text-blue-700 mt-1">
                  <strong>Prompt:</strong> {issue.prompt}
                </p>
              )}
            </div>
          )}

          {/* Action Form - Only show if can start */}
          {canStart && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor={`context-${issue.id}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Select Context / Service
                </label>
                <select
                  id={`context-${issue.id}`}
                  value={selectedContext}
                  onChange={(e) => setSelectedContext(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {serviceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`prompt-${issue.id}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Prompt (optional)
                </label>
                <textarea
                  id={`prompt-${issue.id}`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Escribí acá el prompt para este issue (opcional)…"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </p>
              )}

              <button
                onClick={handleStart}
                disabled={isStarting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start
                  </>
                )}
              </button>
            </div>
          )}

          {!canStart && issue.workflowStatus !== 'pending' && (
            <p className="text-sm text-gray-500 italic">
              This issue is already {issue.workflowStatus === 'in_process' ? 'in process' : 'completed'}.
            </p>
          )}

          {!canStart && !isGithubOpen && issue.workflowStatus === 'pending' && (
            <p className="text-sm text-gray-500 italic">
              This issue is closed on GitHub.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
