import fs from "node:fs";
import path from "node:path";
import type { AuditLog, Task } from "./types.js";

interface DbShape {
  tasks: Task[];
  logs: AuditLog[];
}

const DB_FILE = path.join(process.cwd(), "db.json");

function blank(): DbShape {
  return { tasks: [], logs: [] };
}

// Load once at boot. Missing/corrupt file -> start empty, never crash silently.
function load(): DbShape {
  try {
    if (!fs.existsSync(DB_FILE)) return blank();
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    };
  } catch {
    console.warn("[store] db.json unreadable, starting with empty data");
    return blank();
  }
}

const db: DbShape = load();

// Synchronous write: task + log persist in one step before responding,
// so they can never go out of sync.
function save(): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

export const store = {
  tasks: () => db.tasks,
  logsFor: (taskId: string) =>
    db.logs
      .filter((l) => l.taskId === taskId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
  findTask: (id: string) => db.tasks.find((t) => t.id === id),
  // Append-only: the ONLY writer of tasks/logs. No update/delete for logs exists.
  addTask: (t: Task) => {
    db.tasks.unshift(t);
    save();
  },
  applyStatusChange: (task: Task, toStatus: Task["status"], log: AuditLog) => {
    task.status = toStatus;
    task.updatedAt = log.timestamp;
    db.logs.push(log);
    save();
  },
  removeTask: (id: string) => {
    const i = db.tasks.findIndex((t) => t.id === id);
    if (i === -1) return false;
    db.tasks.splice(i, 1); // logs retained (immutable), just no longer exposed
    save();
    return true;
  },
};

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
