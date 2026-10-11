// Mirror of server domain types — kept in sync manually (small domain).
export type Status = "to_do" | "pending" | "in_progress" | "done";

export const STATUS_ORDER: Status[] = ["to_do", "pending", "in_progress", "done"];

export const ACTORS = ["john.doe", "jane.smith", "admin"] as const;

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  taskId: string;
  actor: string;
  fromStatus: Status;
  toStatus: Status;
  timestamp: string;
}

// UX-only helper: which status the button should offer next.
// Backend re-validates — this is never trusted.
export function nextStatus(s: Status): Status | null {
  const i = STATUS_ORDER.indexOf(s);
  return i >= 0 && i + 1 < STATUS_ORDER.length ? STATUS_ORDER[i + 1] : null;
}
