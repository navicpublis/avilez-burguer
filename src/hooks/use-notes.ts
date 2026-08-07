import { useEffect, useState } from "react";
import { listNotes, subscribe, type Note } from "@/services/notes-store";

/** Anotações internas (reativo). */
export function useNotes(): Note[] {
  const [list, setList] = useState<Note[]>(listNotes);
  useEffect(() => subscribe(() => setList(listNotes())), []);
  return list;
}
