import { Router } from "express";
import { store, uid } from "./store.js";
import {
  ACTORS,
  STATUS_ORDER,
  isValidTransition,
  nextStatus,
  type AuditLog,
  type Status,
  type Task,
} from "./types.js";

export const router = Router();

// GET /tasks — list all (newest first; store keeps unshift order).
router.get("/tasks", (_req, res) => {
  res.json(store.tasks());
});

// POST /tasks — create with status always to_do.
router.post("/tasks", (req, res) => {
  const { title, description } = req.body ?? {};
  if (typeof title !== "string" || title.trim().length === 0 || title.trim().length > 200) {
    res.status(400).json({ error: "title is required (1-200 characters)" });
    return;
  }
  const now = new Date().toISOString();
  const task: Task = {
    id: uid("t"),
    title: title.trim(),
    description: typeof description === "string" ? description : "",
    status: "to_do",
    createdAt: now,
    updatedAt: now,
  };
  store.addTask(task);
  res.status(201).json(task);
});

// PUT /tasks/:id/status — the core endpoint: validate, then apply + log atomically.
router.put("/tasks/:id/status", (req, res) => {
  const { toStatus, actor } = req.body ?? {};
  const task = store.findTask(req.params.id);
  if (!task) {
    res.status(404).json({ error: "task not found" });
    return;
  }
  if (!STATUS_ORDER.includes(toStatus)) {
    res.status(400).json({ error: `"${toStatus}" is not a valid status` });
    return;
  }
  if (typeof actor !== "string" || !(ACTORS as readonly string[]).includes(actor)) {
    res.status(400).json({ error: `actor must be one of: ${ACTORS.join(", ")}` });
    return;
  }
  // Idempotent: same status -> success, no new log.
  if (task.status === toStatus) {
    res.json({ task, audit: null, idempotent: true });
    return;
  }
  // Domain rule: exactly one step forward, never skip or go back.
  const from: Status = task.status;
  const to: Status = toStatus;
  if (!isValidTransition(from, to)) {
    res.status(400).json({
      error: `Invalid transition: from "${from}" to "${to}". Allowed next: ${nextStatus(from) ?? "none (already done)"}.`,
    });
    return;
  }
  const log: AuditLog = {
    id: uid("a"),
    taskId: task.id,
    actor,
    fromStatus: from,
    toStatus: to,
    timestamp: new Date().toISOString(), // server time — client can't forge order
  };
  store.applyStatusChange(task, to, log);
  res.json({ task, audit: log });
});

// DELETE /tasks/:id — remove task, retain logs (immutable).
router.delete("/tasks/:id", (req, res) => {
  if (!store.removeTask(req.params.id)) {
    res.status(404).json({ error: "task not found" });
    return;
  }
  res.json({ deleted: req.params.id });
});

// GET /tasks/:id/audit-logs — chronological history (oldest first).
router.get("/tasks/:id/audit-logs", (req, res) => {
  const task = store.findTask(req.params.id);
  if (!task) {
    res.status(404).json({ error: "task not found" });
    return;
  }
  res.json(store.logsFor(task.id));
});
