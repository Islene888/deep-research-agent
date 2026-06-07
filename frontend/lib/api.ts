import type { Task } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Persistent anonymous user ID stored in localStorage
export function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous'
  const key = 'finsight_user_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json()
}

export async function createTask(question: string): Promise<{ task_id: string }> {
  return request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ question, user_id: getUserId() }),
  })
}

export async function getTask(taskId: string): Promise<Task> {
  return request(`/api/tasks/${taskId}`)
}

export async function listTasks(limit = 20, offset = 0): Promise<Task[]> {
  return request(`/api/tasks?user_id=${getUserId()}&limit=${limit}&offset=${offset}`)
}

export async function deleteTask(taskId: string): Promise<void> {
  await request(`/api/tasks/${taskId}`, { method: 'DELETE' })
}

export async function resumeTask(taskId: string, subQuestions: string[]): Promise<Task> {
  return request(`/api/tasks/${taskId}/resume`, {
    method: 'POST',
    body: JSON.stringify({ sub_questions: subQuestions }),
  })
}

export function streamUrl(taskId: string): string {
  return `${BASE}/api/tasks/${taskId}/stream`
}
