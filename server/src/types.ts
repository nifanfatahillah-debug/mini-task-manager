// Shared domain types: single source of truth for Task, AuditLog, Status.
export type Status = "to_do" | "pending" | "in_progress" | "done";

export const STATUS_ORDER: Status[] = ["to_do", "pending", "in_progress", "done"];

// Predefined actors (hardcoded per spec — no auth).
export const ACTORS = ["john.doe", "jane.smith", "admin"] as const;
export type Actor = (typeof ACTORS)[number];

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  createdAt: string; // ISO, server time, set once
  updatedAt: string; // ISO, server time, updated on each status change
}

export interface AuditLog {
  id: string;
  taskId: string;
  actor: string;
  fromStatus: Status;
  toStatus: Status;
  timestamp: string; // ISO, server time, never modified
}

// Next allowed status, or null when already done.
export function nextStatus(s: Status): Status | null {
  const i = STATUS_ORDER.indexOf(s);
  return i >= 0 && i + 1 < STATUS_ORDER.length ? STATUS_ORDER[i + 1] : null;
}

export function isValidTransition(from: Status, to: Status): boolean {
  return STATUS_ORDER.indexOf(to) - STATUS_ORDER.indexOf(from) === 1;
}
