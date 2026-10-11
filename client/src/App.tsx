import { useEffect, useState } from "react";
import { api } from "./api";
import { ACTORS, nextStatus, type AuditLog, type Task } from "./types";

const STATUS_LABEL: Record<Task["status"], string> = {
  to_do: "To Do",
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
};

export default function App() {
  const [actor, setActor] = useState<string>(ACTORS[0]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    api.list().then(setTasks).catch((e: Error) => setError(e.message));

  useEffect(() => {
    refresh();
  }, []);

  const openLogs = async (t: Task) => {
    setOpenId(t.id);
    setLogs(await api.logs(t.id).catch((e: Error) => {
      setError(e.message);
      return [];
    }));
  };

  const create = async () => {
    setError(null);
    try {
      await api.create(title, desc);
      setTitle("");
      setDesc("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const advance = async (t: Task) => {
    const next = nextStatus(t.status);
    if (!next) return;
    setError(null);
    try {
      await api.advance(t.id, next, actor);
      await refresh();
      if (openId === t.id) setLogs(await api.logs(t.id));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (t: Task) => {
    if (!confirm(`Delete "${t.title}"?`)) return;
    setError(null);
    try {
      await api.remove(t.id);
      if (openId === t.id) setOpenId(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Mini Task Manager</h1>

      <label>
        Acting as{" "}
        <select value={actor} onChange={(e) => setActor(e.target.value)}>
          {ACTORS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <section style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <input
          placeholder="Task title (required)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: 2, padding: 8 }}
        />
        <input
          placeholder="Description (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          style={{ flex: 3, padding: 8 }}
        />
        <button onClick={create}>Add</button>
      </section>

      <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
        {tasks.map((t) => {
          const next = nextStatus(t.status);
          return (
            <li key={t.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{t.title}</strong>
                <span style={{ background: "#eef", borderRadius: 12, padding: "2px 10px" }}>
                  {STATUS_LABEL[t.status]}
                </span>
              </div>
              {t.description && <p style={{ margin: "4px 0", color: "#555" }}>{t.description}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {next && (
                  <button onClick={() => advance(t)}>
                    Move to {STATUS_LABEL[next]}
                  </button>
                )}
                <button onClick={() => (openId === t.id ? setOpenId(null) : openLogs(t))}>
                  {openId === t.id ? "Hide history" : "View history"}
                </button>
                <button onClick={() => remove(t)}>Delete</button>
              </div>
              {openId === t.id && (
                <ol style={{ marginTop: 8, paddingLeft: 20 }}>
                  {logs.length === 0 && <li>No changes yet.</li>}
                  {logs.map((l) => (
                    <li key={l.id}>
                      User &quot;{l.actor}&quot; changed Task &quot;{t.title}&quot; status from &quot;
                      {l.fromStatus}&quot; to &quot;{l.toStatus}&quot; at{" "}
                      {new Date(l.timestamp).toLocaleString()}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ul>
      {tasks.length === 0 && <p>No tasks yet — create one above.</p>}
    </div>
  );
}
