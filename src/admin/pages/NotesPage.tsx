import { useState } from "react";
import { Plus, Check, RotateCcw, Trash2, Pencil, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useNotes } from "@/hooks";
import {
  createNote,
  updateNote,
  deleteNote,
  type NotePriority,
  type Note,
} from "@/services/notes-store";

const PRIO_TONE: Record<NotePriority, string> = {
  alta: "bg-red-500/15 text-red-400",
  media: "bg-amber-500/15 text-amber-400",
  baixa: "bg-secondary text-muted-foreground",
};
const PRIO_LABEL: Record<NotePriority, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

/** Anotações internas do admin. */
export function NotesPage() {
  const notes = useNotes();
  const [editing, setEditing] = useState<Note | "new" | null>(null);

  return (
    <main className="w-full max-w-[1000px] px-4 py-7 pb-12 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-condensed text-[2.2rem] uppercase leading-none tracking-tight">Anotações</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Notas internas da operação. Alta prioridade vira lembrete na Dashboard.</p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-brand-yellow-soft active:scale-[0.98]">
          <Plus className="size-4" /> Nova nota
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">Nenhuma anotação ainda.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {notes.map((n) => (
            <div key={n.id} className={cn("rounded-2xl border border-border bg-card p-4", n.status === "concluida" && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-display font-bold", n.status === "concluida" && "line-through")}>{n.title}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider", PRIO_TONE[n.priority])}>{PRIO_LABEL[n.priority]}</span>
                  </div>
                  {n.date && <div className="text-xs text-muted-foreground">{new Date(n.date).toLocaleDateString("pt-BR")}</div>}
                </div>
              </div>
              {n.content && <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{n.content}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {n.status === "pendente" ? (
                  <button type="button" onClick={() => updateNote(n.id, { status: "concluida" })} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10"><Check className="size-4" /> Concluir</button>
                ) : (
                  <button type="button" onClick={() => updateNote(n.id, { status: "pendente" })} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary"><RotateCcw className="size-4" /> Reabrir</button>
                )}
                <button type="button" onClick={() => setEditing(n)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary"><Pencil className="size-4" /> Editar</button>
                <button type="button" onClick={() => { if (confirm("Excluir esta nota?")) deleteNote(n.id); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground hover:border-red-500 hover:text-red-400"><Trash2 className="size-4" /> Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <NoteEditor note={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </main>
  );
}

function NoteEditor({ note, onClose }: { note: Note | null; onClose: () => void }) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [priority, setPriority] = useState<NotePriority>(note?.priority ?? "media");
  const [date, setDate] = useState(note?.date ?? "");

  function save() {
    if (!title.trim()) return;
    if (note) updateNote(note.id, { title: title.trim(), content: content.trim(), priority, date: date || null });
    else createNote({ title: title.trim(), content: content.trim(), priority, date: date || null });
    onClose();
  }

  const field = "w-full rounded-md border border-border bg-secondary px-3 text-sm focus-visible:border-primary focus-visible:outline-none";

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="font-display text-lg font-bold">{note ? "Editar nota" : "Nova nota"}</div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent"><X className="size-5" /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className={cn(field, "h-11")} />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Conteúdo" className={cn(field, "h-32 resize-none py-2.5")} />
            <div>
              <div className="mb-1.5 text-[0.8rem] font-semibold">Prioridade</div>
              <div className="grid grid-cols-3 gap-2">
                {(["baixa", "media", "alta"] as NotePriority[]).map((p) => (
                  <button key={p} type="button" onClick={() => setPriority(p)} className={cn("h-10 rounded-md border text-sm font-bold capitalize transition-colors", priority === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>{PRIO_LABEL[p]}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[0.8rem] font-semibold">Data (opcional)</div>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(field, "h-11")} />
            </div>
          </div>
        </div>
        <div className="border-t border-border p-4">
          <button type="button" onClick={save} className="h-12 w-full rounded-lg bg-primary font-bold text-primary-foreground transition-colors hover:bg-brand-yellow-soft active:scale-[0.99]">Salvar</button>
        </div>
      </aside>
    </>
  );
}
