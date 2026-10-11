// Single place for all backend calls — UI components never fetch() directly.
import type { AuditLog, Task } from "./types";

const BASE = "http://localhost:3001";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

export const api = {
  list: () => req<Task[]>("/tasks"),
  create: (title: string, description: string) =>
    req<Task>("/tasks", { method: "POST", body: JSON.stringify({ title, description }) }),
  advance: (id: string, toStatus: string, actor: string) =>
    req<{ task: Task; audit: AuditLog | null; idempotent?: boolean }>(`/tasks/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ toStatus, actor }),
    }),
  remove: (id: string) => req<{ deleted: string }>(`/tasks/${id}`, { method: "DELETE" }),
  logs: (id: string) => req<AuditLog[]>(`/tasks/${id}/audit-logs`),
};
