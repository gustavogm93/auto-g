export type GitHubStatus = 'open' | 'closed'

export type WorkflowStatus = 'pending' | 'in_process' | 'end'

export interface Issue {
  id: string
  githubNumber: number
  repository: string
  title: string
  description: string | null
  statusGithub: GitHubStatus
  workflowStatus: WorkflowStatus
  url: string
  labels: string[] | null
  createdAtGithub: string
  updatedAtGithub: string
  selectedContext: string | null
  prompt: string | null
  createdAt: string
  updatedAt: string
}
