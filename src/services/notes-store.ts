/**
 * notes-store — anotações internas do admin. Persiste em 'avilez_notes'
 * com pub/sub. Notas de alta prioridade podem virar lembrete na Dashboard.
 */

export type NotePriority = "baixa" | "media" | "alta";
export type NoteStatus = "pendente" | "concluida";

export interface Note {
  id: string;
  title: string;
  content: string;
  priority: NotePriority;
  date: string | null; // yyyy-mm-dd opcional
  status: NoteStatus;
  createdAt: string;
}

const KEY = "avilez_notes";
const CHANNEL = "avilez_notes_rt";

function uid(): string {
  return `note_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
function read(): Note[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
let channel: BroadcastChannel | null = null;
const listeners = new Set<() => void>();
function ensureChannel() {
  if (!channel && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => listeners.forEach((l) => l());
  }
}
function write(list: Note[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  ensureChannel();
  channel?.postMessage("changed");
  listeners.forEach((l) => l());
}
export function subscribe(cb: () => void): () => void {
  ensureChannel();
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const ORDER: Record<NotePriority, number> = { alta: 0, media: 1, baixa: 2 };

export function listNotes(): Note[] {
  return [...read()].sort((a, b) => {
    if (a.status !== b.status) return a.status === "pendente" ? -1 : 1;
    return ORDER[a.priority] - ORDER[b.priority];
  });
}
export function highPriorityPending(): Note[] {
  return listNotes().filter((n) => n.status === "pendente" && n.priority === "alta");
}

export type NoteInput = Pick<Note, "title" | "content" | "priority" | "date">;
export function createNote(input: NoteInput): Note {
  const list = read();
  const n: Note = { ...input, id: uid(), status: "pendente", createdAt: new Date().toISOString() };
  list.push(n);
  write(list);
  return n;
}
export function updateNote(id: string, patch: Partial<Note>): void {
  const list = read();
  const i = list.findIndex((n) => n.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch };
  write(list);
}
export function deleteNote(id: string): void {
  write(read().filter((n) => n.id !== id));
}
